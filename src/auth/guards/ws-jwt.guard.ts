import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { WsClient, JwtPayload } from '../types/ws.types';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<WsClient>();
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn('WS Auth failed: Missing token');
      throw new UnauthorizedException('Missing token');
    }

    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET') || 'defaultSecret',
      });

      client.user = {
        id: payload.sub,
        role: payload.role,
        egn: payload.egn,
      };

      this.logger.log(`WS Auth success: User ${payload.sub} authenticated`);
      return true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`WS Auth failed: Invalid token - ${message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(client: WsClient): string | null {
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
}
