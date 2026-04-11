import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ambulance } from './entities/ambulance.entity';
import { UsersModule } from '../users/user.module';
import { AmbulancesService } from './ambulance.service';
import { AmbulancesController } from './ambulance.controller';
import { GoogleMapsService } from '../common/services/google-maps.service';
import { DriverInactivityService } from './driver-inactivity.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ambulance]), UsersModule],
  controllers: [AmbulancesController],
  providers: [AmbulancesService, GoogleMapsService, DriverInactivityService],
  exports: [AmbulancesService],
})
export class AmbulancesModule {}
