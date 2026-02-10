import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';
import redisConfig, { RedisConfig } from './redis.config';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly client: Redis;

  constructor(
    @Inject(redisConfig.KEY)
    private readonly config: RedisConfig,
  ) {
    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.quit();
  }
}
