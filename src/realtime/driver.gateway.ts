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

@WebSocketGateway({
  namespace: '/drivers',
  cors: { origin: true, credentials: true },
  allowEIO3: true,
})
@UseGuards(WsJwtGuard)
export class DriverGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DriverGateway.name);

  private driverSockets = new Map<string, string>();
  private socketDrivers = new Map<string, string>();

  private callOffers = new Map<
    string,
    { ambulanceId: string; rejectedAmbulanceIds: Set<string> }
  >();

  private locationRequestId = 0;
  private pendingLocationRequests = new Map<
    number,
    {
      driverIdToAmbulanceId: Map<string, string>;
      collected: Array<{
        ambulanceId: string;
        latitude: number;
        longitude: number;
      }>;
      resolve: (
        value: Array<{
          ambulanceId: string;
          latitude: number;
          longitude: number;
        }>,
      ) => void;
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

    if (!pending.collected.some((c) => c.ambulanceId === ambulanceId)) {
      pending.collected.push({
        ambulanceId,
        latitude: data.latitude,
        longitude: data.longitude,
      });

      await this.ambulancesService.updateLocation(
        ambulanceId,
        data.latitude,
        data.longitude,
      );
    }
  }

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
    const rejected = existing?.rejectedAmbulanceIds ?? new Set<string>();
    this.callOffers.set(callId, {
      ambulanceId,
      rejectedAmbulanceIds: rejected,
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
      rejectedAmbulanceIds: new Set<string>(),
    };
    entry.rejectedAmbulanceIds.add(ambulanceId);
    this.callOffers.set(callId, entry);
  }

  clearOffer(callId: string) {
    this.callOffers.delete(callId);
  }

  getPendingAmbulanceId(callId: string): string | null {
    return this.callOffers.get(callId)?.ambulanceId ?? null;
  }

  getRejectedAmbulanceIds(callId: string): string[] {
    return Array.from(this.callOffers.get(callId)?.rejectedAmbulanceIds ?? []);
  }

  setPendingAmbulance(callId: string, ambulanceId: string) {
    const entry = this.callOffers.get(callId) ?? {
      ambulanceId: '',
      rejectedAmbulanceIds: new Set<string>(),
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
    const headers = client.handshake?.headers as
      | Record<string, string>
      | undefined;

    const authHeader = headers?.authorization || headers?.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    const tokenFromAuth = client.handshake?.auth?.token as string | undefined;
    if (tokenFromAuth) return tokenFromAuth;

    const tokenFromQuery = client.handshake?.query?.token as string | undefined;
    if (tokenFromQuery) return tokenFromQuery;

    return null;
  }

  async refreshAvailableAmbulanceLocations(timeoutMs = 5000): Promise<void> {
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

    const collectedLocations = await new Promise<
      Array<{ ambulanceId: string; latitude: number; longitude: number }>
    >((resolve) => {
      const pendingEntry = {
        driverIdToAmbulanceId,
        collected: [] as Array<{
          ambulanceId: string;
          latitude: number;
          longitude: number;
        }>,
        resolve,
      };
      this.pendingLocationRequests.set(requestId, pendingEntry);

      for (const driverId of onlineDriverIds) {
        this.emitToDriver(driverId, 'location.request', {
          requestId,
        });
      }

      setTimeout(() => {
        const entry = this.pendingLocationRequests.get(requestId);
        this.pendingLocationRequests.delete(requestId);
        resolve(entry?.collected ?? []);
      }, timeoutMs);
    });

    if (collectedLocations.length > 0) {
      this.logger.log(
        `Collected ${collectedLocations.length} location(s) from drivers; updating DB`,
      );
      await this.ambulancesService.bulkUpdateLocations(collectedLocations);
    } else {
      this.logger.warn('No location responses received from drivers');
    }
  }
}
