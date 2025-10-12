import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(dto);
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['profile', 'contacts', 'calls', 'stateArchive'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['profile', 'contacts', 'calls', 'stateArchive'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async findByStateArchiveId(stateArchiveId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { stateArchive: { id: stateArchiveId } },
      relations: ['stateArchive', 'profile'],
    });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await this.usersRepository.update(userId, { 
      refreshToken: refreshToken ?? undefined 
    });
  }

  async createWithExistingStateArchive(stateArchiveId: string, role?: Role): Promise<User> {
    const user = this.usersRepository.create({
      role: role || Role.USER,
      stateArchive: { id: stateArchiveId } as any,
    });
    return this.usersRepository.save(user);
  }
}
