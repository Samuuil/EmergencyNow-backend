import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CallsService } from './call.service';
import { CreateCallDto } from './dto/createCall.dto';
import { UpdateCallDto } from './dto/updateCall.dto';
import { Call } from './entities/call.entity';
import { User } from 'src/users/entities/user.entity';
import { Ambulance } from 'src/ambulances/entities/ambulance.entity';

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

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCallDto, ambulance: Ambulance): Promise<Call> {
    return this.callsService.update(id, dto, ambulance);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.callsService.remove(id).then(() => ({ message: 'Call deleted successfully' }));
  }
}
