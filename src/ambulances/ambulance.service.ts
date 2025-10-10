import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ambulance } from './entities/ambulance.entity';

@Injectable()
export class AmbulancesService {
  constructor(
    @InjectRepository(Ambulance)
    private readonly ambulanceRepository: Repository<Ambulance>,
  ) {}

  async findAll() {
    return this.ambulanceRepository.find();
  }
}
