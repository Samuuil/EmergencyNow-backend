import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedingService } from './seeding.service';

async function runSeeding() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seedingService = app.get(SeedingService);

  const command = process.argv[2];

  try {
    switch (command) {
      case 'seed':
        await seedingService.seedAll();
        break;
      case 'clear':
        await seedingService.clearAll();
        break;
      case 'reset':
        await seedingService.clearAll();
        await seedingService.seedAll();
        break;
      default:
        console.log('Available commands:');
        console.log('  seed  - Run all seeders');
        console.log('  clear - Clear all seed data');
        console.log('  reset - Clear and re-seed all data');
        break;
    }
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

void runSeeding();
