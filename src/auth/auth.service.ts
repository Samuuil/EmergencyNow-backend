import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/user.service';
import { StateArchiveService } from '../state-archive/state-archive.service';
import { MailService } from './services/mail.service';
import { SmsService } from './services/sms.service';
import { VerificationCodeService } from './services/verification-code.service';
import { InitiateLoginDto, LoginMethod } from './dto/initiate-login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { User } from '../users/entities/user.entity';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private stateArchiveService: StateArchiveService,
    private jwtService: JwtService,
    private mailService: MailService,
    private smsService: SmsService,
    private configService: ConfigService,
    private verificationCodeService: VerificationCodeService,
    private redisService: RedisService,
  ) {}

  async initiateLogin(dto: InitiateLoginDto): Promise<{ message: string }> {
    const stateArchive = await this.stateArchiveService.findByEgn(dto.egn);

    if (!stateArchive) {
      throw new NotFoundException('User not found in state archive');
    }

    const code = this.verificationCodeService.generateCode();

    await this.verificationCodeService.saveCode(dto.egn, code, dto.method);

    if (dto.method === LoginMethod.EMAIL) {
      await this.mailService.sendVerificationCode(
        stateArchive.email,
        code,
        stateArchive.fullName,
      );
      return { message: 'Verification code sent to your email' };
    } else {
      await this.smsService.sendVerificationCode(
        stateArchive.phoneNumber,
        code,
        stateArchive.fullName,
      );
      return { message: 'Verification code sent to your phone' };
    }
  }

  async verifyCode(
    dto: VerifyCodeDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    await this.verificationCodeService.verifyAndConsumeCode(dto.egn, dto.code);

    const stateArchive = await this.stateArchiveService.findByEgn(dto.egn);
    if (!stateArchive) {
      throw new NotFoundException('User not found in state archive');
    }

    let user = await this.usersService.findByStateArchiveId(stateArchive.id);

    if (!user) {
      user = await this.usersService.createWithExistingStateArchive(
        stateArchive.id,
      );
    }

    return this.generateTokens(user);
  }

  async refreshToken(
    oldRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: string; [key: string]: any };
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET must be configured');
    }

    try {
      payload = this.jwtService.verify(oldRefreshToken, {
        secret: jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const storedToken = await this.redisService.getRefreshToken(payload.sub);

    if (!storedToken || storedToken !== oldRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateTokens(user);
  }

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!jwtSecret || !jwtRefreshSecret) {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be configured');
    }

    const payload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: '1d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtRefreshSecret,
      expiresIn: '30d',
    });

    await this.redisService.addRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.redisService.removeRefreshToken(userId);
    return { message: 'Logged out successfully' };
  }
}
