import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { BasePaginationDto } from '../common/dtos';
import { CallsService } from './call.service';
import { CreateCallDto } from './dto/createCall.dto';
import { UpdateCallDto } from './dto/updateCall.dto';
import { Call } from './entities/call.entity';
import { User } from '../users/entities/user.entity';
import { CallStatus } from '../common/enums/call-status.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Calls')
@ApiBearerAuth('AccessToken')
@Controller('calls')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new emergency call' })
  create(@Body() dto: CreateCallDto, @CurrentUser() user: User): Promise<Call> {
    return this.callsService.create(dto, user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Get all calls' })
  @ApiQuery({ type: BasePaginationDto })
  findAll(@Paginate() query: PaginateQuery) {
    return this.callsService.findAll(query);
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Get all calls for a specific user' })
  @ApiQuery({ type: BasePaginationDto })
  findByUser(
    @Param('userId') userId: string,
    @Paginate() query: PaginateQuery,
  ) {
    return this.callsService.findByUser(userId, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Get call by ID' })
  findOne(@Param('id') id: string): Promise<Call> {
    return this.callsService.findOne(id);
  }

  @Get(':id/tracking')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Get tracking data for call' })
  getTrackingData(@Param('id') id: string) {
    return this.callsService.getTrackingData(id);
  }

  @Post(':id/hospitals')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Get nearby hospitals for call' })
  getHospitalsForCall(
    @Param('id') id: string,
    @Body() body: { latitude: number; longitude: number },
  ) {
    return this.callsService.getHospitalsForCall(id, body.latitude, body.longitude);
  }

  @Post(':id/select-hospital')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Select hospital for call' })
  selectHospital(
    @Param('id') id: string,
    @Body() body: { hospitalId: string; latitude: number; longitude: number },
  ) {
    return this.callsService.selectHospitalForCall(
      id,
      body.hospitalId,
      body.latitude,
      body.longitude,
    );
  }

  @Get(':id/hospital-route')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Get route to selected hospital' })
  getHospitalRoute(@Param('id') id: string) {
    return this.callsService.getHospitalRouteData(id);
  }

  @Post(':id/dispatch')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Dispatch nearest ambulance to call' })
  dispatchAmbulance(@Param('id') id: string): Promise<Call> {
    return this.callsService.dispatchNearestAmbulance(id);
  }

  @Patch(':id/location')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Update ambulance location for call' })
  updateAmbulanceLocation(
    @Param('id') id: string,
    @Body() body: { latitude: number; longitude: number },
  ): Promise<Call> {
    return this.callsService.updateAmbulanceLocation(id, body.latitude, body.longitude);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Update call status' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: CallStatus },
  ): Promise<Call> {
    return this.callsService.updateStatus(id, body.status);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Update call' })
  update(@Param('id') id: string, @Body() dto: UpdateCallDto): Promise<Call> {
    return this.callsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.DRIVER)
  @ApiOperation({ summary: 'Delete call' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.callsService.remove(id).then(() => ({ message: 'Call deleted successfully' }));
  }
}
