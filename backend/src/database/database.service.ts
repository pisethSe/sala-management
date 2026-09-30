import { Injectable } from '@nestjs/common';
import { Pool, types } from 'pg';
import { STATUSES } from '../common/constants';

// Supabase PostgreSQL access.
// - students: one row per student (full CRUD via StudentsService).
// - school_data: everything else, as one JSONB document (row id 1).
types.setTypeParser(1082, (v: string) => v); // DATE columns stay 'YYYY-MM-DD' strings

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS school_data (
  id int PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS students (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  gender text NOT NULL DEFAULT 'Female',
  dob date,
  class_id text,
  status text NOT NULL DEFAULT 'Active',
  guardian text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`;

@Injectable()
export class DatabaseService {
  // Hosted databases (e.g. Supabase) need SSL; a local server does not.
  private readonly url = process.env.DATABASE_URL || '';
  private readonly isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(this.url);
  readonly pool: Pool = new Pool({
    connectionString: this.url.replace(/[?&]sslmode=[^&]*/, ''),
    ssl: this.isLocal ? false : { rejectUnauthorized: false },
  });

  private ready: Promise<void> | null = null;

  // Creates the tables on first use. The promise is cached so concurrent
  // requests don't race; a failed attempt clears it so the next can retry.
  ensureTables(): Promise<void> {
    this.ready ??= this.pool
      .query(SCHEMA)
      .then(() => undefined)
      .catch((e: unknown) => {
        this.ready = null;
        throw e;
      });
    return this.ready;
  }

  // ---------- school_data (everything except students) ----------

  async loadData(): Promise<Record<string, unknown> | null> {
    await this.ensureTables();
    const { rows } = await this.pool.query('SELECT data FROM school_data WHERE id = 1');
    const data = (rows[0]?.data as Record<string, unknown>) ?? null;
    if (data && Array.isArray((data as { students?: unknown }).students)) {
      // older documents kept students inline: move them to the table
      const students = (data as { students: Record<string, unknown>[] }).students;
      if (students.length) await this.importStudents(students);
      await this.saveData(data);
      delete data.students;
    }
    return data;
  }

  async saveData(data: Record<string, unknown>): Promise<void> {
    await this.ensureTables();
    const { students, ...rest } = data; // students live in their own table
    await this.pool.query(
      `INSERT INTO school_data (id, data, updated_at) VALUES (1, $1, now())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [JSON.stringify(rest)],
    );
  }

  // Copies students from older storage (browser or JSON document), keeping their ids and codes.
  async importStudents(list: Record<string, unknown>[]): Promise<number> {
    await this.ensureTables();
    let n = 0;
    for (const o of list) {
      if (!o?.id || !o?.code || !o?.name) continue;
      const r = await this.pool.query(
        `INSERT INTO students (id, code, name, gender, dob, class_id, status, guardian, phone, address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
        [
          o.id,
          o.code,
          o.name,
          o.gender === 'Male' ? 'Male' : 'Female',
          o.dob || null,
          o.classId || null,
          STATUSES.includes(o.status as string) ? (o.status as string) : 'Active',
          o.guardian || '',
          o.phone || '',
          o.address || '',
        ],
      );
      n += r.rowCount ?? 0;
    }
    return n;
  }
}
