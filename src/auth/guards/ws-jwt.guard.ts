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
import { extractWsToken } from '../../realtime/extract-ws-token.util';

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

    const jwtSecret = this.config.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET must be configured');
    }

    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: jwtSecret,
      });

      client.user = {
        id: payload.sub,
        role: payload.role,
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
    return extractWsToken(client);
  }
}
