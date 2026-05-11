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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { Role } from '../common/enums/role.enum';
import type { WsClient, JwtPayload } from '../auth/types/ws.types';
import { DispatcherCallOfferDto } from '../dispatchers/dto/dispatcher-call-offer.dto';
import { DispatcherAmbulanceSummaryDto } from '../dispatchers/dto/dispatcher-ambulance-summary.dto';
import { extractWsToken } from './extract-ws-token.util';

@WebSocketGateway({
  namespace: '/dispatchers',
  cors: { origin: true, credentials: true },
  allowEIO3: true,
})
export class DispatcherGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DispatcherGateway.name);

  private dispatcherSockets = new Map<string, string>();
  private socketDispatchers = new Map<string, string>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  handleConnection(client: WsClient) {
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

      if (payload.role !== Role.DISPATCHER && payload.role !== Role.ADMIN) {
        this.logger.warn(
          `User ${payload.sub} with role ${payload.role} tried to connect to /dispatchers; disconnecting.`,
        );
        client.disconnect(true);
        return;
      }

      client.user = { id: payload.sub, role: payload.role };

      this.dispatcherSockets.set(payload.sub, client.id);
      this.socketDispatchers.set(client.id, payload.sub);
      this.logger.log(
        `Dispatcher ${payload.sub} connected via WS (socket ${client.id})`,
      );

      this.eventEmitter
        .emitAsync('dispatcher.connected', { dispatcherId: payload.sub })
        .catch((err) =>
          this.logger.error('Failed to emit dispatcher.connected', err),
        );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.warn(`Invalid token; disconnecting: ${message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: WsClient) {
    const dispatcherId = this.socketDispatchers.get(client.id);
    if (dispatcherId) {
      this.dispatcherSockets.delete(dispatcherId);
      this.socketDispatchers.delete(client.id);
      this.logger.log(
        `Dispatcher ${dispatcherId} disconnected (socket ${client.id})`,
      );
      this.eventEmitter
        .emitAsync('dispatcher.disconnected', { dispatcherId })
        .catch((err) =>
          this.logger.error('Failed to emit dispatcher.disconnected', err),
        );
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('call.assign-ambulance')
  async onAssignAmbulance(
    @ConnectedSocket() client: WsClient,
    @MessageBody() data: { callId: string; ambulanceId: string },
  ) {
    const dispatcherId = this.socketDispatchers.get(client.id);
    if (!dispatcherId) return;
    if (!data?.callId || !data?.ambulanceId) return;
    await this.eventEmitter.emitAsync('dispatcher.assign-ambulance', {
      dispatcherId,
      callId: data.callId,
      ambulanceId: data.ambulanceId,
    });
  }

  notifyCallAssigned(
    dispatcherId: string,
    payload: {
      call: DispatcherCallOfferDto;
      ambulances: DispatcherAmbulanceSummaryDto[];
    },
  ): void {
    this.emitToDispatcher(dispatcherId, 'call.assigned', payload);
  }

  notifyCallReleased(
    dispatcherId: string,
    payload: { callId: string; reason: string },
  ): void {
    this.emitToDispatcher(dispatcherId, 'call.released', payload);
  }

  notifyCallCancelled(
    dispatcherId: string,
    payload: { callId: string },
  ): void {
    this.emitToDispatcher(dispatcherId, 'call.cancelled', payload);
  }

  notifyDriverRejected(
    dispatcherId: string,
    payload: {
      callId: string;
      ambulanceId: string;
      ambulances: DispatcherAmbulanceSummaryDto[];
    },
  ): void {
    this.emitToDispatcher(dispatcherId, 'driver.rejected', payload);
  }

  notifyDriverAccepted(
    dispatcherId: string,
    payload: { callId: string; ambulanceId: string },
  ): void {
    this.emitToDispatcher(dispatcherId, 'driver.accepted', payload);
  }

  notifyAmbulanceUnavailable(
    dispatcherId: string,
    payload: {
      callId: string;
      ambulanceId: string;
      ambulances: DispatcherAmbulanceSummaryDto[];
    },
  ): void {
    this.emitToDispatcher(dispatcherId, 'ambulance.unavailable', payload);
  }

  broadcastAmbulanceListUpdated(
    dispatcherIds: string[],
    payload: { ambulances: DispatcherAmbulanceSummaryDto[] },
  ): void {
    for (const id of dispatcherIds) {
      this.emitToDispatcher(id, 'ambulance.list-updated', payload);
    }
  }

  isDispatcherOnline(dispatcherId: string): boolean {
    return this.dispatcherSockets.has(dispatcherId);
  }

  getOnlineDispatcherIds(): string[] {
    return Array.from(this.dispatcherSockets.keys());
  }

  private emitToDispatcher(
    dispatcherId: string,
    event: string,
    data: unknown,
  ): void {
    const socketId = this.dispatcherSockets.get(dispatcherId);
    if (!socketId) {
      this.logger.warn(
        `Dispatcher ${dispatcherId} not connected; cannot emit ${event}`,
      );
      return;
    }
    this.server.to(socketId).emit(event, data);
  }

  private extractToken(client: WsClient): string | null {
    return extractWsToken(client);
  }
}
