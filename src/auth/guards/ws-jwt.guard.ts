import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: any = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn('WS Auth failed: Missing token');
      throw new UnauthorizedException('Missing token');
    }

    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_SECRET') || 'defaultSecret',
      });
      client.user = { id: payload.sub, role: payload.role, egn: payload.egn };
      this.logger.log(`WS Auth success: User ${payload.sub} authenticated`);
      return true;
    } catch (e) {
      this.logger.error(`WS Auth failed: Invalid token - ${e.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(client: any): string | null {
    const headers = client?.handshake?.headers || {};
    const authHeader: string | undefined = headers['authorization'] || headers['Authorization'];

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    const tokenFromAuth = client?.handshake?.auth?.token;
    if (tokenFromAuth && typeof tokenFromAuth === 'string') return tokenFromAuth;

    const tokenFromQuery = client?.handshake?.query?.token;
    if (tokenFromQuery && typeof tokenFromQuery === 'string') return tokenFromQuery;

    return null;
  }
}
