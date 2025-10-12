import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ambulance } from './entities/ambulance.entity';
import { AmbulancesService } from './ambulance.service';
import { AmbulancesController } from './ambulance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ambulance])],
  controllers: [AmbulancesController],
  providers: [AmbulancesService],
  exports: [AmbulancesService],
})
export class AmbulancesModule {}
