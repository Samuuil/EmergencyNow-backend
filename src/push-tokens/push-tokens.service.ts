import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PushToken } from './entities/push-token.entity';

@Injectable()
export class PushTokensService {
  private readonly logger = new Logger(PushTokensService.name);

  constructor(
    @InjectRepository(PushToken)
    private readonly pushTokenRepository: Repository<PushToken>,
  ) {}

  async upsert(userId: string, token: string): Promise<PushToken> {
    const existing = await this.pushTokenRepository.findOne({
      where: { token },
    });

    if (existing) {
      existing.userId = userId;
      existing.lastSeenAt = new Date();
      return this.pushTokenRepository.save(existing);
    }

    const created = this.pushTokenRepository.create({
      userId,
      token,
      lastSeenAt: new Date(),
    });
    return this.pushTokenRepository.save(created);
  }

  async remove(userId: string, token: string): Promise<void> {
    await this.pushTokenRepository.delete({ token, userId });
  }

  async getTokens(userId: string): Promise<string[]> {
    const rows = await this.pushTokenRepository.find({
      where: { userId },
      select: { token: true },
    });
    return rows.map((r) => r.token);
  }

  async removeMany(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await this.pushTokenRepository.delete({ token: In(tokens) });
    this.logger.log(`Pruned ${tokens.length} dead push token(s)`);
  }
}
