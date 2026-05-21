import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly refreshTtlSeconds: number;

  constructor(private configService: ConfigService) {
    this.refreshTtlSeconds = parseInt(
      this.configService.get<string>('REFRESH_TOKEN_TTL_SECONDS', '2592000'),
      10,
    );

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

  async storeRefreshJti(userId: string, jti: string): Promise<void> {
    await Promise.all([
      this.client.setex(`refresh:jti:${jti}`, this.refreshTtlSeconds, userId),
      this.client.setex(
        `refresh:user:${userId}`,
        this.refreshTtlSeconds,
        jti,
      ),
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

  async rotateRefreshJti(
    oldJti: string,
    userId: string,
    newJti: string,
  ): Promise<void> {
    await Promise.all([
      this.client.del(`refresh:jti:${oldJti}`),
      this.client.setex(
        `refresh:jti:${newJti}`,
        this.refreshTtlSeconds,
        userId,
      ),
      this.client.setex(
        `refresh:user:${userId}`,
        this.refreshTtlSeconds,
        newJti,
      ),
    ]);
  }

  private static dispatcherLoadKey(dispatcherId: string): string {
    return `dispatcher:load:${dispatcherId}`;
  }

  private static callHolderKey(callId: string): string {
    return `call:holder:${callId}`;
  }

  private static callSeenKey(callId: string): string {
    return `call:seen:${callId}`;
  }

  async addDispatcherCall(dispatcherId: string, callId: string): Promise<void> {
    await Promise.all([
      this.client.sadd(RedisService.dispatcherLoadKey(dispatcherId), callId),
      this.client.set(RedisService.callHolderKey(callId), dispatcherId),
    ]);
  }

  async removeDispatcherCall(
    dispatcherId: string,
    callId: string,
  ): Promise<void> {
    await Promise.all([
      this.client.srem(RedisService.dispatcherLoadKey(dispatcherId), callId),
      this.client.del(RedisService.callHolderKey(callId)),
    ]);
  }

  async getDispatcherLoad(dispatcherId: string): Promise<number> {
    return this.client.scard(RedisService.dispatcherLoadKey(dispatcherId));
  }

  async dispatcherHoldsCall(
    dispatcherId: string,
    callId: string,
  ): Promise<boolean> {
    const result = await this.client.sismember(
      RedisService.dispatcherLoadKey(dispatcherId),
      callId,
    );
    return result === 1;
  }

  async getCallHolder(callId: string): Promise<string | null> {
    return this.client.get(RedisService.callHolderKey(callId));
  }

  async clearDispatcherCalls(dispatcherId: string): Promise<string[]> {
    const callIds = await this.client.smembers(
      RedisService.dispatcherLoadKey(dispatcherId),
    );
    const pipeline = this.client.pipeline();
    pipeline.del(RedisService.dispatcherLoadKey(dispatcherId));
    for (const callId of callIds) {
      pipeline.del(RedisService.callHolderKey(callId));
    }
    await pipeline.exec();
    return callIds;
  }

  async addSeenDispatcher(callId: string, dispatcherId: string): Promise<void> {
    await this.client.sadd(RedisService.callSeenKey(callId), dispatcherId);
  }

  async getSeenDispatchers(callId: string): Promise<string[]> {
    return this.client.smembers(RedisService.callSeenKey(callId));
  }

  async removeSeenDispatcher(
    callId: string,
    dispatcherId: string,
  ): Promise<void> {
    await this.client.srem(RedisService.callSeenKey(callId), dispatcherId);
  }

  async clearSeenDispatchers(callId: string): Promise<void> {
    await this.client.del(RedisService.callSeenKey(callId));
  }
}
