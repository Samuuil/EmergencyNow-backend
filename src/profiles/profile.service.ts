import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ProfileErrorCode, ProfileErrorMessages } from './errors/profile-errors.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { CreateProfileDto } from './dto/createProfile.dto';
import { UpdateProfileDto } from './dto/updateProfile.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateProfileDto): Promise<Profile> {
    try {
      const profile = this.profileRepository.create(dto);
      return await this.profileRepository.save(profile);
    } catch (error) {
      this.logger.error(`${ProfileErrorMessages[ProfileErrorCode.PROFILE_CREATION_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ProfileErrorCode.PROFILE_CREATION_FAILED,
        message: ProfileErrorMessages[ProfileErrorCode.PROFILE_CREATION_FAILED],
      });
    }
  }

  async findAll(): Promise<Profile[]> {
    try {
      return await this.profileRepository.find();
    } catch (error) {
      this.logger.error(`${ProfileErrorMessages[ProfileErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ProfileErrorCode.DATABASE_ERROR,
        message: ProfileErrorMessages[ProfileErrorCode.DATABASE_ERROR],
      });
    }
  }

  async findOne(id: string): Promise<Profile> {
    try {
      const profile = await this.profileRepository.findOne({ where: { id } });
      if (!profile) {
        throw new NotFoundException({
          code: ProfileErrorCode.PROFILE_NOT_FOUND,
          message: ProfileErrorMessages[ProfileErrorCode.PROFILE_NOT_FOUND],
        });
      }
      return profile;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${ProfileErrorMessages[ProfileErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ProfileErrorCode.DATABASE_ERROR,
        message: ProfileErrorMessages[ProfileErrorCode.DATABASE_ERROR],
      });
    }
  }

  async update(id: string, dto: UpdateProfileDto): Promise<Profile> {
    try {
      await this.profileRepository.update(id, dto);
      return await this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${ProfileErrorMessages[ProfileErrorCode.PROFILE_UPDATE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ProfileErrorCode.PROFILE_UPDATE_FAILED,
        message: ProfileErrorMessages[ProfileErrorCode.PROFILE_UPDATE_FAILED],
      });
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const result = await this.profileRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException({
          code: ProfileErrorCode.PROFILE_NOT_FOUND,
          message: ProfileErrorMessages[ProfileErrorCode.PROFILE_NOT_FOUND],
        });
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${ProfileErrorMessages[ProfileErrorCode.PROFILE_DELETE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ProfileErrorCode.PROFILE_DELETE_FAILED,
        message: ProfileErrorMessages[ProfileErrorCode.PROFILE_DELETE_FAILED],
      });
    }
  }

  async createOrUpdateForUser(userId: string, dto: CreateProfileDto | UpdateProfileDto): Promise<Profile> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile'],
      });

      if (!user) {
        throw new NotFoundException({
          code: ProfileErrorCode.USER_NOT_FOUND,
          message: ProfileErrorMessages[ProfileErrorCode.USER_NOT_FOUND],
        });
      }

      if (user.profile) {
        // Update existing profile
        await this.profileRepository.update(user.profile.id, dto);
        return await this.findOne(user.profile.id);
      } else {
        // Create new profile
        const profile = this.profileRepository.create(dto);
        const savedProfile = await this.profileRepository.save(profile);
        
        // Link profile to user
        user.profile = savedProfile;
        await this.userRepository.save(user);
        
        return savedProfile;
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${ProfileErrorMessages[ProfileErrorCode.PROFILE_CREATION_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ProfileErrorCode.PROFILE_CREATION_FAILED,
        message: ProfileErrorMessages[ProfileErrorCode.PROFILE_CREATION_FAILED],
      });
    }
  }

  async getProfileForUser(userId: string): Promise<Profile> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile'],
      });

      if (!user) {
        throw new NotFoundException({
          code: ProfileErrorCode.USER_NOT_FOUND,
          message: ProfileErrorMessages[ProfileErrorCode.USER_NOT_FOUND],
        });
      }

      if (!user.profile) {
        throw new NotFoundException({
          code: ProfileErrorCode.PROFILE_NOT_FOUND,
          message: ProfileErrorMessages[ProfileErrorCode.PROFILE_NOT_FOUND],
        });
      }

      return user.profile;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${ProfileErrorMessages[ProfileErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: ProfileErrorCode.DATABASE_ERROR,
        message: ProfileErrorMessages[ProfileErrorCode.DATABASE_ERROR],
      });
    }
  }
}
