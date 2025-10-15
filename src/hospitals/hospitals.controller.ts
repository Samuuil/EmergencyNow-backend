import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { Hospital } from './entities/hospital.entity';

@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Post()
  create(@Body() dto: CreateHospitalDto): Promise<Hospital> {
    return this.hospitalsService.create(dto);
  }

  @Get()
  findAll(): Promise<Hospital[]> {
    return this.hospitalsService.findAll();
  }

  @Get('nearest')
  async findNearest(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('limit') limit?: string,
  ) {
    const location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    };
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.hospitalsService.findNearestHospitals(location, limitNum);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Hospital> {
    return this.hospitalsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHospitalDto): Promise<Hospital> {
    return this.hospitalsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.hospitalsService.remove(id);
    return { message: 'Hospital deleted successfully' };
  }

  @Post('sync')
  async syncFromGooglePlaces(
    @Body() body: { latitude: number; longitude: number; radius?: number },
  ): Promise<{ message: string }> {
    await this.hospitalsService.syncHospitalsFromGooglePlaces(
      { latitude: body.latitude, longitude: body.longitude },
      body.radius,
    );
    return { message: 'Hospitals synced successfully' };
  }
}
