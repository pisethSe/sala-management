import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';

const CACHE_KEY = 'sala:data';

@Injectable()
export class SchoolDataService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  // The whole school document (settings, teachers, classes, attendance, exams,
  // grades, fees, payments, books, notices, events, timetable), minus students.
  // Cached read-through: Redis first, then PostgreSQL, then the cache is filled.
  async load(): Promise<Record<string, unknown> | null> {
    const hit = await this.redis.get(CACHE_KEY);
    if (hit) return JSON.parse(hit) as Record<string, unknown>;
    const data = await this.db.loadData();
    if (data) await this.redis.set(CACHE_KEY, JSON.stringify(data));
    return data;
  }

  // Saves everything except students (those go through /api/students).
  // If the payload still has a students array (first-run import from the
  // browser), those students are imported without overwriting existing rows.
  async save(data: Record<string, unknown>): Promise<void> {
    if (!data || typeof data !== 'object' || !(data as { settings?: unknown }).settings) {
      throw new Error('Invalid data');
    }
    if (Array.isArray((data as { students?: unknown }).students) && (data as { students: unknown[] }).students.length) {
      await this.db.importStudents((data as { students: Record<string, unknown>[] }).students);
    }
    await this.db.saveData(data);
    await this.redis.del(CACHE_KEY);
  }
}
