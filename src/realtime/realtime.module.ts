import { Module, forwardRef } from '@nestjs/common';
import { DriverGateway } from './driver.gateway';
import { UserGateway } from './user.gateway';
import { CallsModule } from '../calls/call.module';
import { AmbulancesModule } from '../ambulances/ambulance.module';
import { AuthModule } from '../auth/auth.module';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => CallsModule),
    forwardRef(() => AmbulancesModule),
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'defaultSecret',
      }),
    }),
  ],
  providers: [DriverGateway, UserGateway, WsJwtGuard],
  exports: [DriverGateway, UserGateway],
})
export class RealtimeModule {}
