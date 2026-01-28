import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { BasePaginationDto } from '../common/dtos';
import { AmbulancesService } from './ambulance.service';
import { CreateAmbulanceDto } from './dtos/createAmbulance.dto';
import { UpdateAmbulanceDto } from './dtos/updateAmbulance.dto';
import { AssignDriverDto } from './dtos/assign-driver.dto';
import { Ambulance } from './entities/ambulance.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Ambulances')
@ApiBearerAuth('AccessToken')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DRIVER)
@Controller('ambulances')
export class AmbulancesController {
  constructor(private readonly ambulancesService: AmbulancesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ambulance' })
  create(@Body() dto: CreateAmbulanceDto): Promise<Ambulance> {
    return this.ambulancesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all ambulances' })
  @ApiQuery({ type: BasePaginationDto })
  findAll(@Paginate() query: PaginateQuery) {
    return this.ambulancesService.findAll(query);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get all available ambulances' })
  @ApiQuery({ type: BasePaginationDto })
  findAvailable(@Paginate() query: PaginateQuery) {
    return this.ambulancesService.findAvailable(query);
  }

  @Get('driver/:driverId')
  @ApiOperation({ summary: 'Get ambulance by driver ID' })
  findByDriver(@Param('driverId') driverId: string): Promise<Ambulance | null> {
    return this.ambulancesService.findByDriver(driverId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ambulance by ID' })
  findOne(@Param('id') id: string): Promise<Ambulance> {
    return this.ambulancesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ambulance' })
  update(@Param('id') id: string, @Body() dto: UpdateAmbulanceDto): Promise<Ambulance> {
    return this.ambulancesService.update(id, dto);
  }

  @Patch(':id/location')
  @ApiOperation({ summary: 'Update ambulance location' })
  updateLocation(
    @Param('id') id: string,
    @Body() body: { latitude: number; longitude: number },
  ): Promise<Ambulance> {
    return this.ambulancesService.updateLocation(id, body.latitude, body.longitude);
  }

  @Patch(':id/driver')
  @ApiOperation({ summary: 'Assign or remove driver from ambulance' })
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
  @ApiOperation({ summary: 'Remove driver from ambulance' })
  removeDriver(@Param('id') id: string): Promise<Ambulance> {
    return this.ambulancesService.removeDriver(id);
  }

  @Patch(':id/available')
  @ApiOperation({ summary: 'Mark ambulance as available' })
  markAsAvailable(@Param('id') id: string): Promise<Ambulance> {
    return this.ambulancesService.markAsAvailable(id);
  }

  @Patch(':id/dispatched')
  @ApiOperation({ summary: 'Mark ambulance as dispatched' })
  markAsDispatched(@Param('id') id: string): Promise<Ambulance> {
    return this.ambulancesService.markAsDispatched(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete ambulance' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.ambulancesService.remove(id);
    return { message: 'Ambulance deleted successfully' };
  }
}