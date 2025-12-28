import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { BasePaginationDto } from '../common/dtos';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { Hospital } from './entities/hospital.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Hospitals')
@ApiBearerAuth('AccessToken')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DRIVER)
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
  @ApiQuery({ type: BasePaginationDto })
  findAll(@Paginate() query: PaginateQuery) {
    return this.hospitalsService.findAll(query);
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
