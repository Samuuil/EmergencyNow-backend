import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CallsService } from './call.service';
import { CreateCallDto } from './dto/createCall.dto';
import { UpdateCallDto } from './dto/updateCall.dto';
import { Call } from './entities/call.entity';
import { User } from 'src/users/entities/user.entity';
import { CallStatus } from '../common/enums/call-status.enum';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  create(@Body() dto: CreateCallDto, user: User): Promise<Call> {
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
