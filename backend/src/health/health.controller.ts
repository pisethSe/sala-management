import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { RedisService } from '../redis/redis.service';
import { DatabaseService } from '../database/database.service';

// GET /api/health: public — used by the Docker healthcheck and quick diagnostics.
@Controller('health')
export class HealthController {
  constructor(
    private readonly redis: RedisService,
    private readonly db: DatabaseService,
  ) {}

  @Public()
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
