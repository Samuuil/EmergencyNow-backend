import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { Hospital } from './entities/hospital.entity';

@ApiTags('Hospitals')
@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new hospital' })
  create(@Body() dto: CreateHospitalDto): Promise<Hospital> {
    return this.hospitalsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all hospitals' })
  findAll(): Promise<Hospital[]> {
    return this.hospitalsService.findAll();
  }

  @Get('nearest')
  @ApiOperation({ summary: 'Find nearest hospitals to a location' })
  @ApiQuery({ name: 'latitude', type: String, required: true })
  @ApiQuery({ name: 'longitude', type: String, required: true })
  @ApiQuery({ name: 'limit', type: String, required: false })
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
  @ApiOperation({ summary: 'Get hospital by ID' })
  findOne(@Param('id') id: string): Promise<Hospital> {
    return this.hospitalsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update hospital' })
  update(@Param('id') id: string, @Body() dto: UpdateHospitalDto): Promise<Hospital> {
    return this.hospitalsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete hospital' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.hospitalsService.remove(id);
    return { message: 'Hospital deleted successfully' };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync hospitals from Google Places' })
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
