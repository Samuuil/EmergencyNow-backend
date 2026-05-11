import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>(
      'REDIS_URL',
      'redis://localhost:6379',
    );

    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setex(key, seconds, value);
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async getdel(key: string): Promise<string | null> {
    return await this.client.getdel(key);
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  private static readonly REFRESH_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

  async storeRefreshJti(userId: string, jti: string): Promise<void> {
    await Promise.all([
      this.client.setex(`refresh:jti:${jti}`, RedisService.REFRESH_TTL, userId),
      this.client.setex(`refresh:user:${userId}`, RedisService.REFRESH_TTL, jti),
    ]);
  }

  async validateRefreshJti(jti: string): Promise<boolean> {
    const result = await this.client.exists(`refresh:jti:${jti}`);
    return result === 1;
  }

  async removeRefreshJti(userId: string): Promise<void> {
    const jti = await this.client.getdel(`refresh:user:${userId}`);
    if (jti) {
      await this.client.del(`refresh:jti:${jti}`);
    }
  }

  async rotateRefreshJti(oldJti: string, userId: string, newJti: string): Promise<void> {
    await Promise.all([
      this.client.del(`refresh:jti:${oldJti}`),
      this.client.setex(`refresh:jti:${newJti}`, RedisService.REFRESH_TTL, userId),
      this.client.setex(`refresh:user:${userId}`, RedisService.REFRESH_TTL, newJti),
    ]);
  }
}
