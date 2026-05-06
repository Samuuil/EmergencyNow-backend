import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call } from './entities/call.entity';
import { CallStatus } from '../common/enums/call-status.enum';

@Injectable()
export class CallQueueService {
  private readonly logger = new Logger(CallQueueService.name);

  constructor(
    @InjectRepository(Call)
    private readonly callsRepository: Repository<Call>,
  ) {}

  async getPendingCallsOldestFirst(): Promise<Call[]> {
    return this.callsRepository.find({
      where: { status: CallStatus.PENDING },
      relations: ['user', 'user.stateArchive'],
      order: { createdAt: 'ASC' },
    });
  }

  async getPosition(callId: string): Promise<number> {
    const pending = await this.callsRepository.find({
      where: { status: CallStatus.PENDING },
      order: { createdAt: 'ASC' },
      select: ['id'],
    });
    const idx = pending.findIndex((c) => c.id === callId);
    return idx >= 0 ? idx + 1 : 0;
  }

  async getQueueSize(): Promise<number> {
    return this.callsRepository.count({
      where: { status: CallStatus.PENDING },
    });
  }
}
