import { Controller, Get } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { DatabaseService } from '../database/database.service';

// GET /api/health: used by the Docker healthcheck and quick diagnostics.
@Controller('health')
export class HealthController {
  constructor(
    private readonly redis: RedisService,
    private readonly db: DatabaseService,
  ) {}

  @Get()
  async health() {
    const redisUp = await this.redis.ping();
    let dbUp = false;
    try {
      await this.db.ensureTables();
      await this.db.pool.query('SELECT 1');
      dbUp = true;
    } catch {
      dbUp = false;
    }
    return { ok: dbUp, redis: redisUp ? 'up' : 'down', database: dbUp ? 'up' : 'down' };
  }
}
