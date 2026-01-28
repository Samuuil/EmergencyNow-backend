import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { CallsService } from './call.service';
import { CallsController } from './call.controller';
import { Call } from './entities/call.entity';
import { User } from '../users/entities/user.entity';
import { Ambulance } from '../ambulances/entities/ambulance.entity';
import { AmbulancesModule } from '../ambulances/ambulance.module';
import { HospitalsModule } from '../hospitals/hospitals.module';
import { GoogleMapsService } from '../common/services/google-maps.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';
import { ContactsModule } from '../contacts/contact.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, User, Ambulance]),
    AmbulancesModule,
    HospitalsModule,
    forwardRef(() => RealtimeModule),
    AuthModule,
    ContactsModule,
    JwtModule.register({}),
  ],
  controllers: [CallsController],
  providers: [CallsService, GoogleMapsService, JwtAuthGuard, RolesGuard],
  exports: [CallsService],
})
export class CallsModule {}
