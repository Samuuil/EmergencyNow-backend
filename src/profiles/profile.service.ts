import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { CreateProfileDto } from './dto/createProfile.dto';
import { UpdateProfileDto } from './dto/updateProfile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  create(dto: CreateProfileDto): Promise<Profile> {
    const profile = this.profileRepository.create(dto);
    return this.profileRepository.save(profile);
  }

  findAll(): Promise<Profile[]> {
    return this.profileRepository.find();
  }

  async findOne(id: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    return profile;
  }

  async update(id: string, dto: UpdateProfileDto): Promise<Profile> {
    await this.profileRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.profileRepository.delete(id);
  }
}
