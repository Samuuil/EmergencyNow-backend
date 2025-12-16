import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AmbulancesService } from './ambulance.service';

@Injectable()
export class DriverInactivityService {
  private readonly logger = new Logger(DriverInactivityService.name);

  constructor(private readonly ambulancesService: AmbulancesService) {}

  /**
   * Runs every hour to check for inactive drivers
   * Drivers who haven't accepted a call in 5 hours will be removed from their ambulances
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkInactiveDrivers(): Promise<void> {
    this.logger.log('Checking for inactive drivers...');

    try {
      const removedDriverIds = await this.ambulancesService.removeInactiveDrivers(5);

      if (removedDriverIds.length > 0) {
        this.logger.log(
          `Removed ${removedDriverIds.length} inactive driver(s) from their ambulances: ${removedDriverIds.join(', ')}`
        );
      } else {
        this.logger.log('No inactive drivers found');
      }
    } catch (error) {
      this.logger.error('Error checking for inactive drivers:', error);
    }
  }
}
