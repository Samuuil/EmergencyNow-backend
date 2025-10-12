import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UsersService } from '../users/user.service';
import { StateArchiveService } from '../state-archive/state-archive.service';
import { MailService } from './services/mail.service';
import { SmsService } from './services/sms.service';
import { VerificationCode } from './entities/verification-code.entity';
import { InitiateLoginDto, LoginMethod } from './dto/initiate-login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private stateArchiveService: StateArchiveService,
    private jwtService: JwtService,
    private mailService: MailService,
    private smsService: SmsService,
    private configService: ConfigService,
    @InjectRepository(VerificationCode)
    private verificationCodeRepo: Repository<VerificationCode>,
  ) {}

  async initiateLogin(dto: InitiateLoginDto): Promise<{ message: string }> {
    const stateArchive = await this.stateArchiveService.findByEgn(dto.egn);
    
    if (!stateArchive) {
      throw new NotFoundException('User not found in state archive');
    }

    const code = crypto.randomInt(100000, 999999).toString();
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const verificationCode = this.verificationCodeRepo.create({
      egn: dto.egn,
      code,
      method: dto.method,
      expiresAt,
      isUsed: false,
    });
    await this.verificationCodeRepo.save(verificationCode);

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

  async verifyCode(dto: VerifyCodeDto): Promise<{ accessToken: string; refreshToken: string }> {
    const verificationCode = await this.verificationCodeRepo.findOne({
      where: {
        egn: dto.egn,
        code: dto.code,
        isUsed: false,
      },
    });

    if (!verificationCode) {
      throw new UnauthorizedException('Invalid verification code');
    }

    if (new Date() > verificationCode.expiresAt) {
      throw new UnauthorizedException('Verification code has expired');
    }

    verificationCode.isUsed = true;
    await this.verificationCodeRepo.save(verificationCode);

    const stateArchive = await this.stateArchiveService.findByEgn(dto.egn);
    if (!stateArchive) {
      throw new NotFoundException('User not found in state archive');
    }

    let user = await this.usersService.findByStateArchiveId(stateArchive.id);
    
    if (!user) {
      user = await this.usersService.createWithExistingStateArchive(stateArchive.id);
    }

    return this.generateTokens(user);
  }

  async refreshToken(oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: any;
    try {
      payload = this.jwtService.verify(oldRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'defaultRefreshSecret',
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findOne(payload.sub);
    
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isTokenValid = await bcrypt.compare(oldRefreshToken, user.refreshToken);
    
    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateTokens(user);
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { 
      sub: user.id, 
      role: user.role,
      egn: user.stateArchive?.egn,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'defaultSecret',
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'defaultRefreshSecret',
      expiresIn: '7d',
    });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    return { accessToken, refreshToken };
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  async cleanupExpiredCodes(): Promise<void> {
    await this.verificationCodeRepo.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
