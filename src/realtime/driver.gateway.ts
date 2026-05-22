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

  private readonly onlineDrivers = new Set<string>();

  private callOffers = new Map<string, { ambulanceId: string }>();

  private locationRequestId = 0;
  private lastRefreshStartedAt = 0;
  private static readonly MIN_REFRESH_INTERVAL_MS = 2000;
  private static readonly REFRESH_DEBOUNCE_MS = 2000;
  private static readonly REFRESH_HARD_TIMEOUT_MS = 10000;
  private pendingLocationRequests = new Map<
    number,
    {
      driverIdToAmbulanceId: Map<string, string>;
      respondedAmbulanceIds: Set<string>;
      expectedCount: number;
      debounceTimer?: NodeJS.Timeout;
      hardTimeoutTimer?: NodeJS.Timeout;
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

      void client.join(payload.sub);
      this.onlineDrivers.add(payload.sub);
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
    const driverId = client.user?.id;
    if (driverId) {
      this.onlineDrivers.delete(driverId);
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
    const driverId = client.user?.id;
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
    const driverId = client.user?.id;
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

    if (pending.respondedAmbulanceIds.size >= pending.expectedCount) {
      this.closeLocationRefreshWindow(data.requestId);
      return;
    }

    if (pending.debounceTimer) clearTimeout(pending.debounceTimer);
    pending.debounceTimer = setTimeout(() => {
      this.closeLocationRefreshWindow(data.requestId);
    }, DriverGateway.REFRESH_DEBOUNCE_MS);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('location.update')
  async onLocationUpdate(
    @ConnectedSocket() client: DriverSocket,
    @MessageBody()
    data: { callId: string; latitude: number; longitude: number },
  ) {
    const driverId = client.user?.id;
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
    this.callOffers.set(callId, { ambulanceId });

    this.emitToDriver(driverId, 'call.offer', {
      callId: params.callId,
      description: params.description,
      latitude: params.latitude,
      longitude: params.longitude,
      distance: params.distance,
      duration: params.duration,
    });
  }

  clearOffer(callId: string) {
    this.callOffers.delete(callId);
  }

  getPendingAmbulanceId(callId: string): string | null {
    return this.callOffers.get(callId)?.ambulanceId ?? null;
  }

  setPendingAmbulance(callId: string, ambulanceId: string) {
    const entry = this.callOffers.get(callId) ?? { ambulanceId: '' };
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
    this.server.to(driverId).emit(event, data);
  }

  isDriverOnline(driverId: string): boolean {
    return this.onlineDrivers.has(driverId);
  }

  private extractToken(client: DriverSocket): string | null {
    return extractWsToken(client);
  }

  async refreshAvailableAmbulanceLocations(): Promise<void> {
    const now = Date.now();
    if (
      now - this.lastRefreshStartedAt <
      DriverGateway.MIN_REFRESH_INTERVAL_MS
    ) {
      this.logger.log(
        'Location refresh throttled; sharing an existing in-flight window',
      );
      return;
    }
    this.lastRefreshStartedAt = now;

    const driverIdToAmbulanceId =
      await this.ambulancesService.getDriverIdToAmbulanceIdMap();

    const onlineDriverIds = Array.from(driverIdToAmbulanceId.keys()).filter(
      (dId: string) => this.onlineDrivers.has(dId),
    );

    const requestId = ++this.locationRequestId;

    if (onlineDriverIds.length === 0) {
      this.logger.log(
        'No online drivers with available ambulances to request location from',
      );
      this.eventEmitter.emit('ambulance.locations.refreshed', { requestId });
      return;
    }

    const entry: {
      driverIdToAmbulanceId: Map<string, string>;
      respondedAmbulanceIds: Set<string>;
      expectedCount: number;
      debounceTimer?: NodeJS.Timeout;
      hardTimeoutTimer?: NodeJS.Timeout;
    } = {
      driverIdToAmbulanceId,
      respondedAmbulanceIds: new Set(),
      expectedCount: onlineDriverIds.length,
    };
    this.pendingLocationRequests.set(requestId, entry);

    for (const driverId of onlineDriverIds) {
      this.emitToDriver(driverId, 'location.request', { requestId });
    }

    entry.hardTimeoutTimer = setTimeout(() => {
      this.closeLocationRefreshWindow(requestId);
    }, DriverGateway.REFRESH_HARD_TIMEOUT_MS);
  }

  private closeLocationRefreshWindow(requestId: number): void {
    const entry = this.pendingLocationRequests.get(requestId);
    if (!entry) return;
    if (entry.debounceTimer) clearTimeout(entry.debounceTimer);
    if (entry.hardTimeoutTimer) clearTimeout(entry.hardTimeoutTimer);
    this.pendingLocationRequests.delete(requestId);
    this.eventEmitter.emit('ambulance.locations.refreshed', { requestId });
  }
}
