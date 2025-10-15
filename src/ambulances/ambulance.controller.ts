import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AmbulancesService } from './ambulance.service';
import { CreateAmbulanceDto } from './dtos/createAmbulance.dto';
import { UpdateAmbulanceDto } from './dtos/updateAmbulance.dto';
import { AssignDriverDto } from './dtos/assign-driver.dto';
import { Ambulance } from './entities/ambulance.entity';

@Controller('ambulances')
export class AmbulancesController {
  constructor(private readonly ambulancesService: AmbulancesService) {}

  @Post()
  create(@Body() dto: CreateAmbulanceDto): Promise<Ambulance> {
    return this.ambulancesService.create(dto);
  }

  @Get()
  findAll(): Promise<Ambulance[]> {
    return this.ambulancesService.findAll();
  }

  @Get('available')
  findAvailable(): Promise<Ambulance[]> {
    return this.ambulancesService.findAvailable();
  }

  @Get('driver/:driverId')
  findByDriver(@Param('driverId') driverId: string): Promise<Ambulance | null> {
    return this.ambulancesService.findByDriver(driverId);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Ambulance> {
    return this.ambulancesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAmbulanceDto): Promise<Ambulance> {
    return this.ambulancesService.update(id, dto);
  }

  @Patch(':id/location')
  updateLocation(
    @Param('id') id: string,
    @Body() body: { latitude: number; longitude: number },
  ): Promise<Ambulance> {
    return this.ambulancesService.updateLocation(id, body.latitude, body.longitude);
  }

  @Patch(':id/driver')
  assignDriver(
    @Param('id') id: string,
    @Body() dto: AssignDriverDto,
  ): Promise<Ambulance> {
    if (!dto.driverId) {
      return this.ambulancesService.removeDriver(id);
    }
    return this.ambulancesService.assignDriver(id, dto.driverId);
  }

  @Delete(':id/driver')
  removeDriver(@Param('id') id: string): Promise<Ambulance> {
    return this.ambulancesService.removeDriver(id);
  }

  @Patch(':id/available')
  markAsAvailable(@Param('id') id: string): Promise<Ambulance> {
    return this.ambulancesService.markAsAvailable(id);
  }

  @Patch(':id/dispatched')
  markAsDispatched(@Param('id') id: string): Promise<Ambulance> {
    return this.ambulancesService.markAsDispatched(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.ambulancesService.remove(id);
    return { message: 'Ambulance deleted successfully' };
  }
}