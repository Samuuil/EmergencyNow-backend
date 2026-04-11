import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { StrategyOptions } from 'passport-jwt';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '../../common/enums/role.enum';
import type { JwtPayload } from '../types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET must be configured');

    const opts: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() as (
        req: unknown,
      ) => string | null,
      ignoreExpiration: false,
      secretOrKey: secret,
    };

    super(opts);
  }

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      role: payload.role as Role,
    };
  }
}
