import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { StateArchive } from '../state-archive/entities/state-archive.entity';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UserSeederService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StateArchive)
    private readonly stateArchiveRepository: Repository<StateArchive>,
  ) {}

  async seed(): Promise<User[]> {
    // Get the seeded state archive entries
    const stateArchives = await this.stateArchiveRepository.find({
      where: [
        { egn: '1111111111' },
        { egn: '2222222222' },
        { egn: '3333333333' },
      ],
    });

    if (stateArchives.length !== 3) {
      throw new Error('State archive entries must be seeded first');
    }

    // Sort by EGN to ensure consistent mapping
    stateArchives.sort((a, b) => a.egn.localeCompare(b.egn));

    const userData = [
      {
        role: Role.USER,
        stateArchive: stateArchives[0], // EGN: 1111111111 - Boris Borisov
      },
      {
        role: Role.DRIVER,
        stateArchive: stateArchives[1], // EGN: 2222222222 - Stanislav Trifonov
      },
      {
        role: Role.ADMIN,
        stateArchive: stateArchives[2], // EGN: 3333333333 - Preslav Ivanov
      },
    ];

    // Check if users already exist
    const existingUsers = await this.userRepository.find({
      where: userData.map(data => ({ stateArchive: { id: data.stateArchive.id } })),
      relations: ['stateArchive'],
    });

    const existingStateArchiveIds = existingUsers.map(user => user.stateArchive.id);
    const newUsers = userData.filter(data => !existingStateArchiveIds.includes(data.stateArchive.id));

    if (newUsers.length === 0) {
      console.log('User seed data already exists');
      return existingUsers;
    }

    const createdUsers = await this.userRepository.save(newUsers);
    console.log(`Created ${createdUsers.length} users with roles:`, 
      createdUsers.map(user => `${user.role} (${user.stateArchive.fullName})`));
    
    return [...existingUsers, ...createdUsers];
  }

  async clear(): Promise<void> {
    const stateArchives = await this.stateArchiveRepository.find({
      where: [
        { egn: '1111111111' },
        { egn: '2222222222' },
        { egn: '3333333333' },
      ],
    });

    if (stateArchives.length > 0) {
      const users = await this.userRepository.find({
        where: stateArchives.map(archive => ({ stateArchive: { id: archive.id } })),
      });
      
      if (users.length > 0) {
        await this.userRepository.remove(users);
        console.log('Cleared user seed data');
      }
    }
  }
}
