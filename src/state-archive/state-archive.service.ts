import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StateArchive } from './entities/state-archive.entity';
import { CreateStateArchiveDto } from './dto/create-state-archive.dto';
import { UpdateStateArchiveDto } from './dto/update-state-archive.dto';

@Injectable()
export class StateArchiveService {
  constructor(
    @InjectRepository(StateArchive)
    private readonly archiveRepo: Repository<StateArchive>,
  ) {}

  async create(createDto: CreateStateArchiveDto): Promise<StateArchive> {
    const archive = this.archiveRepo.create(createDto);
    return this.archiveRepo.save(archive);
  }

  async findAll(): Promise<StateArchive[]> {
    return this.archiveRepo.find();
  }

  async findOne(id: string): Promise<StateArchive> {
    const archive = await this.archiveRepo.findOne({ where: { id } });
    if (!archive) throw new NotFoundException('Archive not found');
    return archive;
  }

  async update(id: string, updateDto: UpdateStateArchiveDto): Promise<StateArchive> {
    const archive = await this.findOne(id);
    Object.assign(archive, updateDto);
    return this.archiveRepo.save(archive);
  }

  async remove(id: string): Promise<void> {
    const archive = await this.findOne(id);
    await this.archiveRepo.remove(archive);
  }

  async findByEgn(egn: string): Promise<StateArchive | null> {
    return this.archiveRepo.findOne({ where: { egn } });
  }
}
