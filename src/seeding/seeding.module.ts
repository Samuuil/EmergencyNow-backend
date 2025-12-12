import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StateArchive } from '../state-archive/entities/state-archive.entity';
import { User } from '../users/entities/user.entity';
import { SeedingService } from './seeding.service';
import { StateArchiveSeederService } from './state-archive-seeder.service';
import { UserSeederService } from './user-seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StateArchive, User]),
  ],
  providers: [
    SeedingService,
    StateArchiveSeederService,
    UserSeederService,
  ],
  exports: [SeedingService],
})
export class SeedingModule {}
