import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Call } from './entities/call.entity';
import { CallStatus } from '../common/enums/call-status.enum';

// PENDING calls older than this are considered abandoned test/orphan data.
const STALE_CALL_MINUTES = 60;

@Injectable()
export class CallQueueService {
  private readonly logger = new Logger(CallQueueService.name);

  constructor(
    @InjectRepository(Call)
    private readonly callsRepository: Repository<Call>,
  ) {}

  async getPendingCallsOldestFirst(): Promise<Call[]> {
    const cutoff = this.staleCutoff();
    return this.callsRepository
      .find({
        where: { status: CallStatus.PENDING },
        relations: ['user', 'user.stateArchive'],
        order: { createdAt: 'ASC' },
      })
      .then((calls) => calls.filter((c) => c.createdAt >= cutoff));
  }

  async getPosition(callId: string): Promise<number> {
    const cutoff = this.staleCutoff();
    const pending = await this.callsRepository.find({
      where: { status: CallStatus.PENDING },
      order: { createdAt: 'ASC' },
      select: ['id', 'createdAt'],
    });
    const active = pending.filter((c) => c.createdAt >= cutoff);
    const idx = active.findIndex((c) => c.id === callId);
    return idx >= 0 ? idx + 1 : 0;
  }

  async getQueueSize(): Promise<number> {
    const cutoff = this.staleCutoff();
    const pending = await this.callsRepository.find({
      where: { status: CallStatus.PENDING },
      select: ['id', 'createdAt'],
    });
    return pending.filter((c) => c.createdAt >= cutoff).length;
  }

  async cancelStalePendingCalls(): Promise<string[]> {
    const cutoff = this.staleCutoff();
    const stale = await this.callsRepository.find({
      where: { status: CallStatus.PENDING, createdAt: LessThan(cutoff) },
      select: ['id'],
    });

    if (stale.length === 0) return [];

    const ids = stale.map((c) => c.id);
    await this.callsRepository.update(
      { id: In(ids) },
      { status: CallStatus.CANCELLED },
    );

    this.logger.warn(
      `Auto-cancelled ${stale.length} stale PENDING call(s) older than ${STALE_CALL_MINUTES} minutes: ${ids.join(', ')}`,
    );

    return ids;
  }

  private staleCutoff(): Date {
    const d = new Date();
    d.setMinutes(d.getMinutes() - STALE_CALL_MINUTES);
    return d;
  }
}
