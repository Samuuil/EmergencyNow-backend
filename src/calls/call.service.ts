import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call } from './entities/call.entity';
import { CreateCallDto } from './dto/createCall.dto';
import { UpdateCallDto } from './dto/updateCall.dto';
import { User } from '../users/entities/user.entity';
import { Ambulance } from '../ambulances/entities/ambulance.entity';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private readonly callsRepository: Repository<Call>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Ambulance)
    private readonly ambulanceRepository: Repository<Ambulance>,
  ) {}

  async create(dto: CreateCallDto, user: User): Promise<Call> {
    //const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) throw new Error('User not found');

    const call = this.callsRepository.create({
      description: dto.description,
      latitude: dto.latitude,
      longitude: dto.longitude,
      user,
    });

    return this.callsRepository.save(call);
  }

  findAll(): Promise<Call[]> {
    return this.callsRepository.find({ relations: ['user', 'ambulance'] });
  }

  async findOne(id: string): Promise<Call> {
    const call = await this.callsRepository.findOne({
      where: { id },
      relations: ['user', 'ambulance'],
    });
  
    if (!call) {
      throw new NotFoundException(`Call with ID ${id} not found!`);
    }
  
    return call;
  }

  async update(id: string, dto: UpdateCallDto, ambulance : Ambulance): Promise<Call> {
    const call = await this.findOne(id);
    if (!call) throw new Error('Call not found');

    Object.assign(call, dto);

    call.ambulance = ambulance;

    return this.callsRepository.save(call);
  }

  async remove(id: string): Promise<void> {
    await this.callsRepository.delete(id);
  }
}
