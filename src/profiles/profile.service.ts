import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { CreateProfileDto } from './dto/createProfile.dto';
import { UpdateProfileDto } from './dto/updateProfile.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

  async createOrUpdateForUser(userId: string, dto: CreateProfileDto | UpdateProfileDto): Promise<Profile> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.profile) {
      // Update existing profile
      await this.profileRepository.update(user.profile.id, dto);
      return this.findOne(user.profile.id);
    } else {
      // Create new profile
      const profile = this.profileRepository.create(dto);
      const savedProfile = await this.profileRepository.save(profile);
      
      // Link profile to user
      user.profile = savedProfile;
      await this.userRepository.save(user);
      
      return savedProfile;
    }
  }

  async getProfileForUser(userId: string): Promise<Profile> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.profile) {
      throw new NotFoundException(`Profile not found for user`);
    }

    return user.profile;
  }
}
