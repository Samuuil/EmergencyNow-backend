import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, PaginateQuery, FilterOperator } from 'nestjs-paginate';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { Role } from '../common/enums/role.enum';
import { UserErrorCode, UserErrorMessages } from './errors/user-errors.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    try {
      const user = this.usersRepository.create(dto);
      return await this.usersRepository.save(user);
    } catch (error) {
      this.logger.error(`${UserErrorMessages[UserErrorCode.USER_CREATION_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: UserErrorCode.USER_CREATION_FAILED,
        message: UserErrorMessages[UserErrorCode.USER_CREATION_FAILED],
      });
    }
  }

  async findAll(query: PaginateQuery) {
    try {
      return paginate(query, this.usersRepository, {
        sortableColumns: ['id', 'role'],
        defaultSortBy: [['id', 'ASC']],
        searchableColumns: [],
        filterableColumns: {
          role: [FilterOperator.EQ],
        },
        relations: ['profile', 'contacts', 'calls', 'stateArchive'],
        defaultLimit: 10,
        maxLimit: 100,
      });
    } catch (error) {
      this.logger.error(`${UserErrorMessages[UserErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: UserErrorCode.DATABASE_ERROR,
        message: UserErrorMessages[UserErrorCode.DATABASE_ERROR],
      });
    }
  }

  async findOne(id: string): Promise<User> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id },
        relations: ['profile', 'contacts', 'calls', 'stateArchive'],
      });
      if (!user) {
        throw new NotFoundException({
          code: UserErrorCode.USER_NOT_FOUND,
          message: UserErrorMessages[UserErrorCode.USER_NOT_FOUND],
        });
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${UserErrorMessages[UserErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: UserErrorCode.DATABASE_ERROR,
        message: UserErrorMessages[UserErrorCode.DATABASE_ERROR],
      });
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    try {
      const user = await this.findOne(id);
      Object.assign(user, dto);
      return await this.usersRepository.save(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${UserErrorMessages[UserErrorCode.USER_UPDATE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: UserErrorCode.USER_UPDATE_FAILED,
        message: UserErrorMessages[UserErrorCode.USER_UPDATE_FAILED],
      });
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const result = await this.usersRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException({
          code: UserErrorCode.USER_NOT_FOUND,
          message: UserErrorMessages[UserErrorCode.USER_NOT_FOUND],
        });
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${UserErrorMessages[UserErrorCode.USER_DELETE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: UserErrorCode.USER_DELETE_FAILED,
        message: UserErrorMessages[UserErrorCode.USER_DELETE_FAILED],
      });
    }
  }

  async findByStateArchiveId(stateArchiveId: string): Promise<User | null> {
    try {
      return await this.usersRepository.findOne({
        where: { stateArchive: { id: stateArchiveId } },
        relations: ['stateArchive', 'profile'],
      });
    } catch (error) {
      this.logger.error(`${UserErrorMessages[UserErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: UserErrorCode.DATABASE_ERROR,
        message: UserErrorMessages[UserErrorCode.DATABASE_ERROR],
      });
    }
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    try {
      await this.usersRepository.update(userId, { 
        refreshToken: refreshToken ?? undefined 
      });
    } catch (error) {
      this.logger.error(`${UserErrorMessages[UserErrorCode.REFRESH_TOKEN_UPDATE_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: UserErrorCode.REFRESH_TOKEN_UPDATE_FAILED,
        message: UserErrorMessages[UserErrorCode.REFRESH_TOKEN_UPDATE_FAILED],
      });
    }
  }

  async createWithExistingStateArchive(stateArchiveId: string, role?: Role): Promise<User> {
    try {
      const user = this.usersRepository.create({
        role: role || Role.USER,
        stateArchive: { id: stateArchiveId } as any,
      });
      return await this.usersRepository.save(user);
    } catch (error) {
      this.logger.error(`${UserErrorMessages[UserErrorCode.USER_CREATION_FAILED]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: UserErrorCode.USER_CREATION_FAILED,
        message: UserErrorMessages[UserErrorCode.USER_CREATION_FAILED],
      });
    }
  }

  async findUserRole(userId: string): Promise<string> {
    try {
      const user = await this.findOne(userId);
      return user.role;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`${UserErrorMessages[UserErrorCode.DATABASE_ERROR]}: ${error.message}`, error.stack);
      throw new InternalServerErrorException({
        code: UserErrorCode.DATABASE_ERROR,
        message: UserErrorMessages[UserErrorCode.DATABASE_ERROR],
      });
    }
  }
}
