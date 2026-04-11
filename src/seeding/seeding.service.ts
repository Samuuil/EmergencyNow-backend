import { Injectable, Logger } from '@nestjs/common';
import { StateArchiveSeederService } from './state-archive-seeder.service';
import { UserSeederService } from './user-seeder.service';

@Injectable()
export class SeedingService {
  private readonly logger = new Logger(SeedingService.name);

  constructor(
    private readonly stateArchiveSeederService: StateArchiveSeederService,
    private readonly userSeederService: UserSeederService,
  ) {}

  async seedAll(): Promise<void> {
    this.logger.log('Starting database seeding...');

    try {
      this.logger.log('Seeding state archive entries...');
      await this.stateArchiveSeederService.seed();

      this.logger.log('Seeding users...');
      await this.userSeederService.seed();

      this.logger.log('Database seeding completed successfully!');
    } catch (error) {
      this.logger.error('Error during seeding:', error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    this.logger.log('Clearing seed data...');

    try {
      await this.userSeederService.clear();
      await this.stateArchiveSeederService.clear();

      this.logger.log('Seed data cleared successfully!');
    } catch (error) {
      this.logger.error('Error during clearing:', error);
      throw error;
    }
  }
}
