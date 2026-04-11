import { Module } from '@nestjs/common';
import { DriverGateway } from './driver.gateway';
import { UserGateway } from './user.gateway';
import { AmbulancesModule } from '../ambulances/ambulance.module';
import { AuthModule } from '../auth/auth.module';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    AmbulancesModule,
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET must be configured');
        return { secret };
      },
    }),
  ],
  providers: [DriverGateway, UserGateway, WsJwtGuard],
  exports: [DriverGateway, UserGateway],
})
export class RealtimeModule {}
