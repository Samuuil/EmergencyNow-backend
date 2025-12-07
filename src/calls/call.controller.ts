import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CallsService } from './call.service';
import { CreateCallDto } from './dto/createCall.dto';
import { UpdateCallDto } from './dto/updateCall.dto';
import { Call } from './entities/call.entity';
import { User } from 'src/users/entities/user.entity';
import { CallStatus } from '../common/enums/call-status.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  create(@Body() dto: CreateCallDto, @CurrentUser() user: User): Promise<Call> {
    return this.callsService.create(dto, user);
  }

  @Get()
  findAll(): Promise<Call[]> {
    return this.callsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Call> {
    return this.callsService.findOne(id);
  }

  @Get(':id/tracking')
  getTrackingData(@Param('id') id: string) {
    return this.callsService.getTrackingData(id);
  }

  @Post(':id/hospitals')
  getHospitalsForCall(
    @Param('id') id: string,
    @Body() body: { latitude: number; longitude: number },
  ) {
    return this.callsService.getHospitalsForCall(id, body.latitude, body.longitude);
  }

  @Post(':id/select-hospital')
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
  getHospitalRoute(@Param('id') id: string) {
    return this.callsService.getHospitalRouteData(id);
  }

  @Post(':id/dispatch')
  dispatchAmbulance(@Param('id') id: string): Promise<Call> {
    return this.callsService.dispatchNearestAmbulance(id);
  }

  @Patch(':id/location')
  updateAmbulanceLocation(
    @Param('id') id: string,
    @Body() body: { latitude: number; longitude: number },
  ): Promise<Call> {
    return this.callsService.updateAmbulanceLocation(id, body.latitude, body.longitude);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: CallStatus },
  ): Promise<Call> {
    return this.callsService.updateStatus(id, body.status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCallDto): Promise<Call> {
    return this.callsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.callsService.remove(id).then(() => ({ message: 'Call deleted successfully' }));
  }
}
