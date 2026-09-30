import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { STATUSES } from '../common/constants';
import { ValidationException } from '../common/api-exceptions.filter';

interface StudentRow {
  id: string;
  code: string;
  name: string;
  gender: string;
  dob: string | null;
  classId: string | null;
  status: string;
  guardian: string;
  phone: string;
  address: string;
}

const COLS = `id, code, name, gender, dob, class_id AS "classId", status, guardian, phone, address`;
const CACHE_KEY = 'sala:students';

@Injectable()
export class StudentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  // Checks and cleans a student payload. Returns the fields to store.
  private async clean(o: Record<string, unknown>) {
    const s = {
      name: String(o.name ?? '').trim(),
      gender: o.gender === 'Male' ? 'Male' : 'Female',
      dob: o.dob ? String(o.dob) : null,
      classId: o.classId ? String(o.classId) : null,
      status: (o.status as string) || 'Active',
      guardian: String(o.guardian ?? '').trim(),
      phone: String(o.phone ?? '').trim(),
      address: String(o.address ?? '').trim(),
    };
    if (!s.name) throw new ValidationException('Full name is required');
    if (!s.guardian) throw new ValidationException('Parent or guardian is required');
    if (!s.phone) throw new ValidationException('Guardian phone is required');
    if (!STATUSES.includes(s.status)) throw new ValidationException('Unknown status: ' + s.status);
    if (s.dob && !/^\d{4}-\d{2}-\d{2}$/.test(s.dob))
      throw new ValidationException('Date of birth must be YYYY-MM-DD');
    if (s.classId) {
      const data = await this.db.loadData();
      if (!data || !(data.classes as { id: string }[] | undefined)?.some((c) => c.id === s.classId))
        throw new ValidationException('That class does not exist');
    }
    return s;
  }

  private async invalidate() {
    await this.redis.del(CACHE_KEY);
  }

  // Cached read-through: Redis first, then PostgreSQL, then the cache is filled.
  async listStudents(): Promise<StudentRow[]> {
    const hit = await this.redis.get(CACHE_KEY);
    if (hit) return JSON.parse(hit) as StudentRow[];
    await this.db.ensureTables();
    const { rows } = await this.db.pool.query(`SELECT ${COLS} FROM students ORDER BY code`);
    await this.redis.set(CACHE_KEY, JSON.stringify(rows));
    return rows as StudentRow[];
  }

  async getStudent(id: string): Promise<StudentRow | null> {
    await this.db.ensureTables();
    const { rows } = await this.db.pool.query(`SELECT ${COLS} FROM students WHERE id = $1`, [id]);
    return (rows[0] as StudentRow) ?? null;
  }

  async createStudent(o: Record<string, unknown> = {}): Promise<StudentRow> {
    const s = await this.clean(o);
    await this.db.ensureTables();
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(4201)'); // serialise code numbering
      const {
        rows: [m],
      } = await client.query(
        `SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '\\D', '', 'g'), '')::int), 0) + 1 AS n FROM students`,
      );
      const id = 's' + randomBytes(4).toString('hex');
      const code = 'STU-' + String(m.n).padStart(3, '0');
      const { rows } = await client.query(
        `INSERT INTO students (id, code, name, gender, dob, class_id, status, guardian, phone, address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${COLS}`,
        [id, code, s.name, s.gender, s.dob, s.classId, s.status, s.guardian, s.phone, s.address],
      );
      await client.query('COMMIT');
      await this.invalidate();
      return rows[0] as StudentRow;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async updateStudent(id: string, o: Record<string, unknown> = {}): Promise<StudentRow | null> {
    const s = await this.clean(o);
    await this.db.ensureTables();
    const { rows } = await this.db.pool.query(
      `UPDATE students SET name=$2, gender=$3, dob=$4, class_id=$5, status=$6, guardian=$7, phone=$8, address=$9, updated_at=now()
       WHERE id = $1 RETURNING ${COLS}`,
      [id, s.name, s.gender, s.dob, s.classId, s.status, s.guardian, s.phone, s.address],
    );
    await this.invalidate();
    return (rows[0] as StudentRow) ?? null;
  }

  async deleteStudent(id: string): Promise<boolean> {
    await this.db.ensureTables();
    const { rowCount } = await this.db.pool.query('DELETE FROM students WHERE id = $1', [id]);
    await this.invalidate();
    return (rowCount ?? 0) > 0;
  }

  async deleteAllStudents(): Promise<void> {
    await this.db.ensureTables();
    await this.db.pool.query('DELETE FROM students');
    await this.invalidate();
  }
}
