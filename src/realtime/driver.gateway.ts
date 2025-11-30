import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, Inject, forwardRef, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { CallsService } from '../calls/call.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ namespace: '/drivers', cors: { origin: true, credentials: true }, allowEIO3: true })
@UseGuards(WsJwtGuard)
export class DriverGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DriverGateway.name);

  // driverId -> socketId
  private driverSockets = new Map<string, string>();
  // socketId -> driverId
  private socketDrivers = new Map<string, string>();

  // callId -> { ambulanceId, rejectedAmbulanceIds }
  private callOffers = new Map<string, { ambulanceId: string; rejectedAmbulanceIds: Set<string> }>();

  constructor(
    @Inject(forwardRef(() => CallsService))
    private readonly callsService: CallsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    // Authenticate via JWT from handshake (header/auth/query)
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(`Missing token on WS connection; disconnecting.`);
      client.disconnect(true);
      return;
    }
    try {
      const payload: any = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_SECRET') || 'defaultSecret',
      });
      const user = { id: payload.sub, role: payload.role, egn: payload.egn };
      (client as any).user = user;
      // Accept connection; only assigned drivers will receive offers
      this.driverSockets.set(user.id, client.id);
      this.socketDrivers.set(client.id, user.id);
      this.logger.log(`User ${user.id} connected via WS (socket ${client.id})`);
    } catch (e) {
      this.logger.warn(`Invalid token on WS connection; disconnecting.`);
      client.disconnect(true);
    }
  }

  private extractToken(client: Socket): string | null {
    const headers = (client as any)?.handshake?.headers || {};
    const authHeader: string | undefined = headers['authorization'] || headers['Authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    const tokenFromAuth = (client as any)?.handshake?.auth?.token;
    if (tokenFromAuth && typeof tokenFromAuth === 'string') return tokenFromAuth;
    const tokenFromQuery = (client as any)?.handshake?.query?.token as string | undefined;
    if (tokenFromQuery && typeof tokenFromQuery === 'string') return tokenFromQuery;
    return null;
  }

  handleDisconnect(client: Socket) {
    const driverId = this.socketDrivers.get(client.id);
    if (driverId) {
      this.driverSockets.delete(driverId);
      this.socketDrivers.delete(client.id);
      this.logger.log(`Driver ${driverId} disconnected (socket ${client.id})`);
    }
  }

  // Driver responds to an offer
  @SubscribeMessage('call.respond')
  async onDriverRespond(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { callId: string; accept: boolean },
  ) {
    const driverId = this.socketDrivers.get(client.id);
    if (!driverId) return;
    await this.callsService.handleDriverResponse(data.callId, driverId, data.accept);
  }

  // Driver sends location updates
  @SubscribeMessage('location.update')
  async onLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { callId: string; latitude: number; longitude: number },
  ) {
    const driverId = this.socketDrivers.get(client.id);
    if (!driverId) return;
    try {
      const call = await this.callsService.updateAmbulanceLocation(
        data.callId,
        data.latitude,
        data.longitude,
      );
      if (call && call.routePolyline && call.estimatedDistance && call.estimatedDuration) {
        this.emitToDriver(driverId, 'route.update', {
          callId: call.id,
          route: {
            polyline: call.routePolyline,
            distance: call.estimatedDistance,
            duration: call.estimatedDuration,
            steps: call.routeSteps || [],
          },
        });
      }
    } catch (e) {
      this.logger.error(`Failed to handle location update: ${e?.message || e}`);
    }
  }

  // Offer a call to a driver's ambulance
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
    // register mapping
    const existing = this.callOffers.get(callId);
    const rejected = existing?.rejectedAmbulanceIds ?? new Set<string>();
    this.callOffers.set(callId, { ambulanceId, rejectedAmbulanceIds: rejected });

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
    const entry = this.callOffers.get(callId) ?? { ambulanceId: '', rejectedAmbulanceIds: new Set<string>() };
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
    const entry = this.callOffers.get(callId) ?? { ambulanceId: '', rejectedAmbulanceIds: new Set<string>() };
    entry.ambulanceId = ambulanceId;
    this.callOffers.set(callId, entry);
  }

  sendRouteToDriver(driverId: string, payload: {
    callId: string;
    route: { polyline: string; distance: number; duration: number; steps: any[] };
  }) {
    this.emitToDriver(driverId, 'call.route', payload);
  }

  private emitToDriver(driverId: string, event: string, data: any) {
    const socketId = this.driverSockets.get(driverId);
    if (!socketId) {
      this.logger.warn(`Driver ${driverId} not connected; cannot emit ${event}`);
      return;
    }
    this.server.to(socketId).emit(event, data);
  }

  isDriverOnline(driverId: string): boolean {
    return this.driverSockets.has(driverId);
  }
}
