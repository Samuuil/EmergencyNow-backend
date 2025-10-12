import { Controller, Get } from '@nestjs/common';
import { AmbulancesService } from './ambulance.service';

@Controller('ambulances')
export class AmbulancesController {
  constructor(private readonly ambulancesService: AmbulancesService) {}

  @Get()
  async findAll() {
    return this.ambulancesService.findAll();
  }
}