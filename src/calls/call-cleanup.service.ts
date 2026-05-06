import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CallQueueService } from './call-queue.service';

@Injectable()
export class CallCleanupService {
  private readonly logger = new Logger(CallCleanupService.name);

  constructor(private readonly callQueueService: CallQueueService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cancelStaleCalls(): Promise<void> {
    try {
      const cancelled = await this.callQueueService.cancelStalePendingCalls();
      if (cancelled.length > 0) {
        this.logger.warn(
          `Periodic cleanup cancelled ${cancelled.length} stale call(s)`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to run stale call cleanup', err);
    }
  }
}
