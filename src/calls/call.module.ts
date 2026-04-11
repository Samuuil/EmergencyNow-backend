import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallsService } from './call.service';
import { CallsController } from './call.controller';
import { Call } from './entities/call.entity';
import { AmbulancesModule } from '../ambulances/ambulance.module';
import { UsersModule } from '../users/user.module';
import { HospitalsModule } from '../hospitals/hospitals.module';
import { GoogleMapsService } from '../common/services/google-maps.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';
import { ContactsModule } from '../contacts/contact.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call]),
    AmbulancesModule,
    UsersModule,
    HospitalsModule,
    RealtimeModule,
    AuthModule,
    ContactsModule,
  ],
  controllers: [CallsController],
  providers: [CallsService, GoogleMapsService, JwtAuthGuard, RolesGuard],
  exports: [CallsService],
})
export class CallsModule {}
