import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { RedisService } from '../../common/redis/redis.service';
import { UsersService } from '../../users/user.service';
import type { JwtPayload } from '../types/auth.types';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) throw new Error('JWT_REFRESH_SECRET must be configured');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    const session = await this.redisService.getRefreshToken(payload.sub);
    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return user;
  }
}
