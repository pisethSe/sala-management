// One-off: creates the tables in Supabase PostgreSQL. Run with:
//   npm run db:init    (= node --env-file=.env.local scripts/db-init.mjs)
// The same SQL also lives in src/database/database.service.ts (SCHEMA).
import { Pool, types } from 'pg';

types.setTypeParser(1082, (v) => v); // DATE columns stay 'YYYY-MM-DD' strings

// Hosted databases (e.g. Supabase) need SSL; a local server does not.
const url = process.env.DATABASE_URL || '';
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
const pool = new Pool({
  connectionString: url.replace(/[?&]sslmode=[^&]*/, ''),
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const SCHEMA = `
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

try {
  await pool.query(SCHEMA);
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
  );
  const cols = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'students' AND table_schema = 'public' ORDER BY ordinal_position`,
  );
  console.log('Tables:', rows.map((r) => r.table_name).join(', '));
  console.log('students columns:');
  for (const c of cols.rows) console.log(`  - ${c.column_name} ${c.data_type}`);
  console.log('Database ready.');
} catch (e) {
  console.error('Failed to initialise the database:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
