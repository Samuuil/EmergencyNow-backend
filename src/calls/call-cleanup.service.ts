import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Call } from './entities/call.entity';
import { CallStatus } from '../common/enums/call-status.enum';

// PENDING calls older than this are considered abandoned and auto-cancelled.
const STALE_CALL_MINUTES = 60;

@Injectable()
export class CallCleanupService {
  private readonly logger = new Logger(CallCleanupService.name);

  constructor(
    @InjectRepository(Call)
    private readonly callsRepository: Repository<Call>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cancelStaleCalls(): Promise<void> {
    try {
      const cancelled = await this.cancelStalePendingCalls();
      if (cancelled.length > 0) {
        this.logger.warn(
          `Periodic cleanup cancelled ${cancelled.length} stale call(s)`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to run stale call cleanup', err);
    }
  }

  async cancelStalePendingCalls(): Promise<string[]> {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - STALE_CALL_MINUTES);

    const stale = await this.callsRepository.find({
      where: { status: CallStatus.PENDING, createdAt: LessThan(cutoff) },
      select: ['id'],
    });

    if (stale.length === 0) return [];

    const ids = stale.map((c) => c.id);
    await this.callsRepository.update(
      { id: In(ids) },
      {
        status: CallStatus.CANCELLED,
        assignedDispatcherId: null,
        dispatcherAssignedAt: null,
      },
    );

    this.logger.warn(
      `Auto-cancelled ${stale.length} stale PENDING call(s) older than ${STALE_CALL_MINUTES} minutes: ${ids.join(', ')}`,
    );

    return ids;
  }
}
