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

  async addRefreshToken(userId: string, refreshToken: string): Promise<string> {
    const key = `refresh-token:${userId}`;
    const existingToken = await this.client.get(key);
    
    if (existingToken) {
      await this.client.del(key);
    }
    
    // Store for 30 days (2592000 seconds)
    await this.client.set(key, refreshToken, 'EX', 2592000);
    return refreshToken;
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    const key = `refresh-token:${userId}`;
    const token = await this.client.get(key);
    return token ? token : null;
  }

  async removeRefreshToken(userId: string): Promise<void> {
    const key = `refresh-token:${userId}`;
    await this.client.del(key);
  }
}
