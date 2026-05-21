import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import type { UserSocket, JwtPayload } from './user.types';
import { extractWsToken } from './extract-ws-token.util';

@WebSocketGateway({
  namespace: '/users',
  cors: { origin: true, credentials: true },
  allowEIO3: true,
})
export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(UserGateway.name);

  private readonly onlineUsers = new Set<string>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: UserSocket) {
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

      client.join(payload.sub);
      this.onlineUsers.add(payload.sub);
      this.logger.log(
        `User ${payload.sub} connected to /users namespace (socket ${client.id})`,
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.warn(`Invalid token; disconnecting: ${message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: UserSocket) {
    const userId = client.user?.id;
    if (userId) {
      this.onlineUsers.delete(userId);
      this.logger.log(
        `User ${userId} disconnected from /users namespace (socket ${client.id})`,
      );
    }
  }

  private extractToken(client: UserSocket): string | null {
    return extractWsToken(client);
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
    this.logger.log(
      `[notifyLocationUpdate] Emitting ambulance.location to user ${userId}, callId=${payload.callId}, lat=${payload.ambulanceLocation.latitude}, lng=${payload.ambulanceLocation.longitude}`,
    );
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

  notifyCallAwaitingDispatcher(
    userId: string,
    payload: {
      callId: string;
      position: number;
      queueSize: number;
    },
  ) {
    this.emitToUser(userId, 'call.awaiting-dispatcher', payload);
  }

  notifyCallWithDispatcher(
    userId: string,
    payload: { callId: string },
  ) {
    this.emitToUser(userId, 'call.with-dispatcher', payload);
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  private emitToUser(userId: string, event: string, data: any) {
    this.server.to(userId).emit(event, data);
  }
}
