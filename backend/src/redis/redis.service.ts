import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

// Redis is a cache in front of PostgreSQL, never a hard dependency:
// if it is unreachable every method returns null/false and the caller
// falls through to the database, so the API keeps working.
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;
  private loggedDown = false;

  constructor() {
    const url = process.env.REDIS_URL || '';
    this.client = url
      ? new Redis(url, {
          enableOfflineQueue: false, // fail fast instead of queueing while disconnected
          maxRetriesPerRequest: 2,
          retryStrategy: (times: number) => Math.min(times * 500, 10_000),
        })
      : null;
    this.client?.on('error', (err: Error) => {
      if (!this.loggedDown) {
        this.loggedDown = true;
        this.logger.warn(`Redis unavailable, serving from the database: ${err.message}`);
      }
    });
    this.client?.on('ready', () => {
      if (this.loggedDown) {
        this.loggedDown = false;
        this.logger.log('Redis is back up.');
      }
    });
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch {
      // cache writes are best-effort
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || !keys.length) return;
    try {
      await this.client.del(...keys);
    } catch {
      // invalidation is best-effort; the TTL bounds staleness anyway
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit().catch(() => undefined);
  }
}
