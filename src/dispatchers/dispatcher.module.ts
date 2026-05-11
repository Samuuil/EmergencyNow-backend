import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Call } from '../calls/entities/call.entity';
import { DispatcherService } from './dispatcher.service';
import { DispatcherController } from './dispatcher.controller';
import { AmbulancesModule } from '../ambulances/ambulance.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';
import { GoogleMapsService } from '../common/services/google-maps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call]),
    AmbulancesModule,
    forwardRef(() => RealtimeModule),
    AuthModule,
  ],
  controllers: [DispatcherController],
  providers: [DispatcherService, GoogleMapsService, JwtAuthGuard, RolesGuard],
  exports: [DispatcherService],
})
export class DispatchersModule {}
