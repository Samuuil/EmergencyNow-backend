import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ namespace: '/users', cors: { origin: true, credentials: true }, allowEIO3: true })
@UseGuards(WsJwtGuard)
export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(UserGateway.name);

  private userSockets = new Map<string, string>();
  private socketUsers = new Map<string, string>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn('No token provided; disconnecting.');
      client.disconnect(true);
      return;
    }

    try {
      const payload: any = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_SECRET') || 'defaultSecret',
      });

      (client as any).user = { id: payload.sub, role: payload.role, egn: payload.egn };

      this.userSockets.set(payload.sub, client.id);
      this.socketUsers.set(client.id, payload.sub);
      this.logger.log(`User ${payload.sub} connected to /users namespace (socket ${client.id})`);
    } catch (e: any) {
      this.logger.warn(`Invalid token; disconnecting: ${e.message}`);
      client.disconnect(true);
    }
  }


  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      this.userSockets.delete(userId);
      this.socketUsers.delete(client.id);
      this.logger.log(`User ${userId} disconnected from /users namespace (socket ${client.id})`);
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

    const tokenFromQuery = (client as any)?.handshake?.query?.token;
    if (tokenFromQuery && typeof tokenFromQuery === 'string') return tokenFromQuery as string;

    return null;
  }

  notifyCallDispatched(
    userId: string,
    payload: {
      callId: string;
      ambulanceId: string;
      ambulanceLocation: { latitude: number; longitude: number };
      route: {
        polyline: string;
        distance: number;
        duration: number;
        steps: any[];
      };
    },
  ) {
    this.emitToUser(userId, 'call.dispatched', payload);
  }

  notifyLocationUpdate(
    userId: string,
    payload: {
      callId: string;
      ambulanceLocation: { latitude: number; longitude: number };
      route: {
        polyline: string;
        distance: number;
        duration: number;
        steps: any[];
      } | null;
    },
  ) {
    this.logger.log(`[notifyLocationUpdate] Emitting ambulance.location to user ${userId}, callId=${payload.callId}, lat=${payload.ambulanceLocation.latitude}, lng=${payload.ambulanceLocation.longitude}`);
    this.emitToUser(userId, 'ambulance.location', payload);
  }

  notifyStatusChange(
    userId: string,
    payload: {
      callId: string;
      status: string;
    },
  ) {
    this.emitToUser(userId, 'call.status', payload);
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  private emitToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (!socketId) {
      this.logger.warn(`User ${userId} not connected; cannot emit ${event}`);
      return;
    }
    this.logger.log(`[emitToUser] Emitting ${event} to user ${userId} (socket ${socketId})`);
    this.server.to(socketId).emit(event, data);
  }
}
