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

  // userId -> socketId
  private userSockets = new Map<string, string>();
  // socketId -> userId
  private socketUsers = new Map<string, string>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(`Missing token on user WS connection; disconnecting.`);
      client.disconnect(true);
      return;
    }
    try {
      const payload: any = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_SECRET') || 'defaultSecret',
      });
      const user = { id: payload.sub, role: payload.role, egn: payload.egn };
      (client as any).user = user;

      this.userSockets.set(user.id, client.id);
      this.socketUsers.set(client.id, user.id);
      this.logger.log(`User ${user.id} connected to /users namespace (socket ${client.id})`);
    } catch (e) {
      this.logger.warn(`Invalid token on user WS connection; disconnecting.`);
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
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      this.userSockets.delete(userId);
      this.socketUsers.delete(client.id);
      this.logger.log(`User ${userId} disconnected from /users namespace (socket ${client.id})`);
    }
  }

  /**
   * Notify user that their call has been dispatched with initial route info
   */
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

  /**
   * Notify user of ambulance location update with fresh route
   */
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
    this.emitToUser(userId, 'ambulance.location', payload);
  }

  /**
   * Notify user of call status change
   */
  notifyStatusChange(
    userId: string,
    payload: {
      callId: string;
      status: string;
    },
  ) {
    this.emitToUser(userId, 'call.status', payload);
  }

  /**
   * Check if user is currently connected
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  private emitToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (!socketId) {
      this.logger.debug(`User ${userId} not connected; cannot emit ${event}`);
      return;
    }
    this.server.to(socketId).emit(event, data);
  }
}
