import { Injectable } from '@nestjs/common';
import { StateArchiveSeederService } from './state-archive-seeder.service';
import { UserSeederService } from './user-seeder.service';

@Injectable()
export class SeedingService {
  constructor(
    private readonly stateArchiveSeederService: StateArchiveSeederService,
    private readonly userSeederService: UserSeederService,
  ) {}

  async seedAll(): Promise<void> {
    console.log('Starting database seeding...');
    
    try {
      // First seed state archive entries
      console.log('Seeding state archive entries...');
      await this.stateArchiveSeederService.seed();
      
      // Then seed users
      console.log('Seeding users...');
      await this.userSeederService.seed();
      
      console.log('Database seeding completed successfully!');
    } catch (error) {
      console.error('Error during seeding:', error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    console.log('Clearing seed data...');
    
    try {
      // Clear in reverse order (users first, then state archives)
      await this.userSeederService.clear();
      await this.stateArchiveSeederService.clear();
      
      console.log('Seed data cleared successfully!');
    } catch (error) {
      console.error('Error during clearing:', error);
      throw error;
    }
  }
}
