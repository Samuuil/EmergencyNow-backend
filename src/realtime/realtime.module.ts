import { Module, forwardRef } from '@nestjs/common';
import { DriverGateway } from './driver.gateway';
import { CallsModule } from '../calls/call.module';
import { AuthModule } from '../auth/auth.module';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => CallsModule),
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'defaultSecret',
      }),
    }),
  ],
  providers: [DriverGateway, WsJwtGuard],
  exports: [DriverGateway],
})
export class RealtimeModule {}
