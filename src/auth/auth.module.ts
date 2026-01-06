import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/user.module';
import { StateArchiveModule } from '../state-archive/state-archive.module';
import { RedisModule } from '../common/redis/redis.module';
import { MailService } from './services/mail.service';
import { SmsService } from './services/sms.service';
import { VerificationCodeService } from './services/verification-code.service';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    StateArchiveModule,
    PassportModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'defaultSecret',
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, MailService, SmsService, VerificationCodeService],
  controllers: [AuthController],
  exports: [AuthService, MailService, SmsService],
})
export class AuthModule {}
