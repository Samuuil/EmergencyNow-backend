import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { AmbulancesService } from '../ambulances/ambulance.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import type { DriverSocket, JwtPayload } from './driver.types';
import { extractWsToken } from './extract-ws-token.util';

@WebSocketGateway({
  namespace: '/drivers',
  cors: { origin: true, credentials: true },
  allowEIO3: true,
})
export class DriverGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DriverGateway.name);

  private driverSockets = new Map<string, string>();
  private socketDrivers = new Map<string, string>();

  // Rejections expire after this many ms so the same driver can be re-offered
  // when no other ambulances are available.
  private static readonly REJECTION_EXPIRY_MS = 30 * 1000;

  private callOffers = new Map<
    string,
    { ambulanceId: string; rejectedAmbulances: Map<string, number> }
  >();

  private locationRequestId = 0;
  private pendingLocationRequests = new Map<
    number,
    {
      driverIdToAmbulanceId: Map<string, string>;
      respondedAmbulanceIds: Set<string>;
    }
  >();

  constructor(
    private readonly ambulancesService: AmbulancesService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  handleConnection(client: DriverSocket) {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn('No token provided; disconnecting.');
      client.disconnect(true);
      return;
    }

    try {
      const jwtSecret = this.config.get<string>('JWT_SECRET');
      if (!jwtSecret) throw new Error('JWT_SECRET must be configured');

      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: jwtSecret,
      });

      client.user = {
        id: payload.sub,
        role: payload.role,
      };

      this.driverSockets.set(payload.sub, client.id);
      this.socketDrivers.set(client.id, payload.sub);
      this.logger.log(
        `Driver ${payload.sub} connected via WS (socket ${client.id})`,
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.warn(`Invalid token; disconnecting: ${message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: DriverSocket) {
    const driverId = this.socketDrivers.get(client.id);
    if (driverId) {
      this.driverSockets.delete(driverId);
      this.socketDrivers.delete(client.id);
      this.logger.log(`Driver ${driverId} disconnected (socket ${client.id})`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('call.respond')
  async onDriverRespond(
    @ConnectedSocket() client: DriverSocket,
    @MessageBody()
    data: { callId: string; accept: boolean },
  ) {
    const driverId = this.socketDrivers.get(client.id);
    if (!driverId) return;
    await this.eventEmitter.emitAsync('driver.responded', {
      callId: data.callId,
      driverId,
      accept: data.accept,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('location.response')
  async onLocationResponse(
    @ConnectedSocket() client: DriverSocket,
    @MessageBody()
    data: { requestId: number; latitude: number; longitude: number },
  ) {
    const driverId = this.socketDrivers.get(client.id);
    if (!driverId) return;

    const pending = this.pendingLocationRequests.get(data.requestId);
    if (!pending) return;

    const ambulanceId = pending.driverIdToAmbulanceId.get(driverId);
    if (!ambulanceId) return;

    if (!pending.respondedAmbulanceIds.has(ambulanceId)) {
      pending.respondedAmbulanceIds.add(ambulanceId);
      await this.ambulancesService.updateLocation(
        ambulanceId,
        data.latitude,
        data.longitude,
      );
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('location.update')
  async onLocationUpdate(
    @ConnectedSocket() client: DriverSocket,
    @MessageBody()
    data: { callId: string; latitude: number; longitude: number },
  ) {
    const driverId = this.socketDrivers.get(client.id);
    this.logger.log(
      `[location.update] Received from socket ${client.id}, driverId=${driverId}, callId=${data?.callId}, lat=${data?.latitude}, lng=${data?.longitude}`,
    );
    if (!driverId) {
      this.logger.warn(
        `[location.update] No driverId found for socket ${client.id}; ignoring`,
      );
      return;
    }
    await this.eventEmitter.emitAsync('driver.location.updated', {
      callId: data.callId,
      latitude: data.latitude,
      longitude: data.longitude,
      driverId,
    });
  }

  offerCall(params: {
    callId: string;
    description: string;
    latitude: number;
    longitude: number;
    ambulanceId: string;
    driverId: string;
    distance: number;
    duration: number;
  }) {
    const { driverId, callId, ambulanceId } = params;
    const existing = this.callOffers.get(callId);
    const rejected = existing?.rejectedAmbulances ?? new Map<string, number>();
    this.callOffers.set(callId, {
      ambulanceId,
      rejectedAmbulances: rejected,
    });

    this.emitToDriver(driverId, 'call.offer', {
      callId: params.callId,
      description: params.description,
      latitude: params.latitude,
      longitude: params.longitude,
      distance: params.distance,
      duration: params.duration,
    });
  }

  addRejection(callId: string, ambulanceId: string) {
    const entry = this.callOffers.get(callId) ?? {
      ambulanceId: '',
      rejectedAmbulances: new Map<string, number>(),
    };
    entry.rejectedAmbulances.set(ambulanceId, Date.now());
    this.callOffers.set(callId, entry);
  }

  clearOffer(callId: string) {
    this.callOffers.delete(callId);
  }

  getPendingAmbulanceId(callId: string): string | null {
    return this.callOffers.get(callId)?.ambulanceId ?? null;
  }

  getRejectedAmbulanceIds(callId: string): string[] {
    const entry = this.callOffers.get(callId);
    if (!entry) return [];

    const cutoff = Date.now() - DriverGateway.REJECTION_EXPIRY_MS;
    const active: string[] = [];
    for (const [ambId, ts] of entry.rejectedAmbulances) {
      if (ts >= cutoff) {
        active.push(ambId);
      } else {
        entry.rejectedAmbulances.delete(ambId);
      }
    }
    return active;
  }

  setPendingAmbulance(callId: string, ambulanceId: string) {
    const entry = this.callOffers.get(callId) ?? {
      ambulanceId: '',
      rejectedAmbulances: new Map<string, number>(),
    };
    entry.ambulanceId = ambulanceId;
    this.callOffers.set(callId, entry);
  }

  sendRouteToDriver(
    driverId: string,
    payload: {
      callId: string;
      route: {
        polyline: string;
        distance: number;
        duration: number;
        steps: any[];
      };
    },
  ) {
    this.emitToDriver(driverId, 'call.route', payload);
  }

  private emitToDriver(driverId: string, event: string, data: any) {
    const socketId = this.driverSockets.get(driverId);
    if (!socketId) {
      this.logger.warn(
        `Driver ${driverId} not connected; cannot emit ${event}`,
      );
      return;
    }
    this.server.to(socketId).emit(event, data);
  }

  isDriverOnline(driverId: string): boolean {
    return this.driverSockets.has(driverId);
  }

  private extractToken(client: DriverSocket): string | null {
    return extractWsToken(client);
  }

  async refreshAvailableAmbulanceLocations(): Promise<void> {
    const driverIdToAmbulanceId =
      await this.ambulancesService.getDriverIdToAmbulanceIdMap();

    const onlineDriverIds = Array.from(driverIdToAmbulanceId.keys()).filter(
      (dId: string) => this.driverSockets.has(dId),
    );

    if (onlineDriverIds.length === 0) {
      this.logger.log(
        'No online drivers with available ambulances to request location from',
      );
      return;
    }

    const requestId = ++this.locationRequestId;
    this.pendingLocationRequests.set(requestId, {
      driverIdToAmbulanceId,
      respondedAmbulanceIds: new Set(),
    });

    for (const driverId of onlineDriverIds) {
      this.emitToDriver(driverId, 'location.request', { requestId });
    }

    setTimeout(() => {
      this.pendingLocationRequests.delete(requestId);
    }, 10000);
  }
}
