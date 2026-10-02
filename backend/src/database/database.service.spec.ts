import { DatabaseService, SCHEMA } from '../database/database.service';

// The pool connects lazily, so these tests never open real connections.
function makeService(url: string) {
  process.env.DATABASE_URL = url;
  return new DatabaseService();
}

describe('DatabaseService', () => {
  afterEach(async () => {
    delete process.env.DATABASE_URL;
  });

  describe('pool configuration', () => {
    it('enables SSL for hosted (non-local) databases', () => {
      const svc = makeService('postgresql://postgres.ref:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres');
      expect(svc.pool.options.ssl).toEqual({ rejectUnauthorized: false });
      return svc.pool.end();
    });

    it('disables SSL for a local database', () => {
      const svc = makeService('postgresql://postgres:pw@localhost:5432/sala_sms');
      expect(svc.pool.options.ssl).toBe(false);
      return svc.pool.end();
    });

    it('disables SSL for 127.0.0.1', () => {
      const svc = makeService('postgresql://postgres:pw@127.0.0.1:5432/db');
      expect(svc.pool.options.ssl).toBe(false);
      return svc.pool.end();
    });

    it('strips sslmode from the connection string', () => {
      const svc = makeService('postgresql://postgres.ref:pw@host:5432/postgres?sslmode=no-verify');
      expect(svc.pool.options.connectionString).toBe('postgresql://postgres.ref:pw@host:5432/postgres');
      return svc.pool.end();
    });
  });

  describe('ensureTables', () => {
    it('creates the tables once for concurrent calls', async () => {
      const svc = makeService('postgresql://postgres:pw@localhost:5432/db');
      svc.pool.query = jest.fn().mockResolvedValue({});
      await Promise.all([svc.ensureTables(), svc.ensureTables(), svc.ensureTables()]);
      expect(svc.pool.query).toHaveBeenCalledTimes(1);
      expect(svc.pool.query).toHaveBeenCalledWith(SCHEMA);
      await svc.pool.end();
    });

    it('retries after a failed attempt', async () => {
      const svc = makeService('postgresql://postgres:pw@localhost:5432/db');
      svc.pool.query = jest.fn()
        .mockRejectedValueOnce(new Error('connection refused'))
        .mockResolvedValueOnce({});
      await expect(svc.ensureTables()).rejects.toThrow('connection refused');
      await expect(svc.ensureTables()).resolves.toBeUndefined();
      expect(svc.pool.query).toHaveBeenCalledTimes(2);
      await svc.pool.end();
    });

    it('creates both tables in the schema', () => {
      expect(SCHEMA).toContain('CREATE TABLE IF NOT EXISTS school_data');
      expect(SCHEMA).toContain('CREATE TABLE IF NOT EXISTS students');
      expect(SCHEMA).toContain('data jsonb NOT NULL');
      expect(SCHEMA).toContain('code text NOT NULL UNIQUE');
    });
  });

  describe('loadData (legacy inline students migration)', () => {
    it('moves legacy inline students into the table and strips them', async () => {
      const svc = makeService('postgresql://postgres:pw@localhost:5432/db');
      const legacy = { classes: [], students: [{ id: 's1', code: 'STU-001', name: 'Old' }] };
      (svc.pool as any).query = jest.fn(async (q: string) => {
        if (q.includes('SELECT data FROM school_data')) return { rows: [{ data: legacy }] };
        if (q.includes('INSERT INTO students')) return { rowCount: 1 };
        if (q.includes('ON CONFLICT (id) DO UPDATE')) return {};
        return {};
      });
      const data = await svc.loadData();
      expect(data && (data as any).students).toBeUndefined(); // stripped from the doc
      const calls = (svc.pool.query as jest.Mock).mock.calls.map(c => c[0]);
      expect(calls.some(q => q.includes('INSERT INTO students'))).toBe(true); // imported
      expect(calls.some(q => q.includes('ON CONFLICT (id) DO UPDATE'))).toBe(true); // doc saved
      await svc.pool.end();
    });

    it('returns null for an empty database', async () => {
      const svc = makeService('postgresql://postgres:pw@localhost:5432/db');
      svc.pool.query = jest.fn().mockResolvedValue({ rows: [] });
      await expect(svc.loadData()).resolves.toBeNull();
      await svc.pool.end();
    });
  });

  describe('saveData', () => {
    it('upserts the document with students stripped', async () => {
      const svc = makeService('postgresql://postgres:pw@localhost:5432/db');
      svc.pool.query = jest.fn().mockResolvedValue({});
      await svc.saveData({ settings: { a: 1 }, students: [{ id: 's1' }] } as any);
      expect(svc.pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (id) DO UPDATE'),
        [JSON.stringify({ settings: { a: 1 } })],
      );
      await svc.pool.end();
    });
  });

  describe('importStudents', () => {
    it('keeps ids and codes and normalizes fields', async () => {
      const svc = makeService('postgresql://postgres:pw@localhost:5432/db');
      svc.pool.query = jest.fn().mockResolvedValue({ rowCount: 1 });
      const n = await svc.importStudents([
        { id: 's1', code: 'STU-001', name: 'A', gender: 'Male', status: 'Active' },
        { code: 'STU-002', name: 'No id' }, // skipped: no id
        { id: 's3', code: 'STU-003', name: 'C', status: 'Bogus' },
      ] as any);
      expect(n).toBe(2);
      const inserts = (svc.pool.query as jest.Mock).mock.calls.filter(c => String(c[0]).includes('INSERT INTO students'));
      expect(inserts[0][1][0]).toBe('s1'); // id kept
      expect(inserts[0][1][1]).toBe('STU-001'); // code kept
      expect(inserts[0][1][3]).toBe('Male');
      expect(inserts[1][1][6]).toBe('Active'); // unknown status → Active
      await svc.pool.end();
    });
  });
});
