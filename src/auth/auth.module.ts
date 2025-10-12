import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/user.module';
import { StateArchiveModule } from '../state-archive/state-archive.module';
import { VerificationCode } from './entities/verification-code.entity';
import { MailService } from './services/mail.service';
import { SmsService } from './services/sms.service';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    StateArchiveModule,
    PassportModule,
    TypeOrmModule.forFeature([VerificationCode]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'defaultSecret',
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, MailService, SmsService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
