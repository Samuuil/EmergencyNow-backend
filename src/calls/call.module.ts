import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallsService } from './call.service';
import { CallsController } from './call.controller';
import { Call } from './entities/call.entity';
import { User } from '../users/entities/user.entity';
import { Ambulance } from '../ambulances/entities/ambulance.entity';
import { AmbulancesModule } from '../ambulances/ambulance.module';
import { GoogleMapsService } from '../common/services/google-maps.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, User, Ambulance]),
    AmbulancesModule,
  ],
  controllers: [CallsController],
  providers: [CallsService, GoogleMapsService],
  exports: [CallsService],
})
export class CallsModule {}
