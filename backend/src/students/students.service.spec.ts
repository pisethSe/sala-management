import { Test } from '@nestjs/testing';
import { StudentsService } from './students.service';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { ValidationException } from '../common/api-exceptions.filter';

const insertedRow = { id: 'sabc1234', code: 'STU-005', name: 'Test', gender: 'Female', dob: null, classId: null, status: 'Active', guardian: 'G', phone: 'P', address: '' };

// A transaction-capable client mock: BEGIN/lock/count/INSERT/COMMIT.
const makeClient = (row = insertedRow) => ({
  query: jest.fn(async (q: string) => {
    if (q === 'BEGIN' || q === 'COMMIT' || q === 'ROLLBACK') return {};
    if (q.includes('pg_advisory_xact_lock')) return {};
    if (q.includes('COALESCE(MAX')) return { rows: [{ n: 5 }] }; // max code 4 → next is 5
    if (q.includes('INSERT INTO students')) return { rows: [row] };
    return {};
  }),
  release: jest.fn(),
});

const mockDb = () => ({
  ensureTables: jest.fn().mockResolvedValue(undefined),
  loadData: jest.fn().mockResolvedValue({ classes: [{ id: 'c1', name: 'Grade 10A' }] }),
  pool: { query: jest.fn().mockResolvedValue({ rows: [] }), connect: jest.fn() },
});
const mockRedis = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
});

const valid = { name: 'Test Student', gender: 'Male', guardian: 'Guardian', phone: '012345678' };

describe('StudentsService', () => {
  let service: StudentsService;
  let db: ReturnType<typeof mockDb>;
  let redis: ReturnType<typeof mockRedis>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: DatabaseService, useFactory: mockDb },
        { provide: RedisService, useFactory: mockRedis },
      ],
    }).compile();
    service = moduleRef.get(StudentsService);
    db = moduleRef.get(DatabaseService);
    redis = moduleRef.get(RedisService);
  });

  describe('validation (clean, through createStudent)', () => {
    it('rejects an empty name', async () => {
      await expect(service.createStudent({ ...valid, name: '   ' }))
        .rejects.toThrow(new ValidationException('Full name is required'));
    });

    it('rejects a missing guardian', async () => {
      await expect(service.createStudent({ ...valid, guardian: '' }))
        .rejects.toThrow('Parent or guardian is required');
    });

    it('rejects a missing phone', async () => {
      await expect(service.createStudent({ ...valid, phone: '' }))
        .rejects.toThrow('Guardian phone is required');
    });

    it('rejects an unknown status', async () => {
      await expect(service.createStudent({ ...valid, status: 'Expelled' }))
        .rejects.toThrow('Unknown status: Expelled');
    });

    it('rejects a malformed date of birth', async () => {
      await expect(service.createStudent({ ...valid, dob: '31/12/2010' }))
        .rejects.toThrow('Date of birth must be YYYY-MM-DD');
    });

    it('accepts a well-formed date of birth', async () => {
      db.pool.connect.mockResolvedValue(makeClient());
      await expect(service.createStudent({ ...valid, dob: '2010-12-31' })).resolves.toBeDefined();
    });

    it('rejects a class that does not exist', async () => {
      await expect(service.createStudent({ ...valid, classId: 'nope' }))
        .rejects.toThrow('That class does not exist');
    });

    it('accepts a class that exists', async () => {
      db.pool.connect.mockResolvedValue(makeClient());
      await expect(service.createStudent({ ...valid, classId: 'c1' })).resolves.toBeDefined();
    });
  });

  describe('createStudent', () => {
    it('assigns the id and the next STU- code from max+1', async () => {
      const client = makeClient({ ...insertedRow, code: 'STU-005' });
      db.pool.connect.mockResolvedValue(client);
      const student = await service.createStudent(valid);
      expect(student.code).toBe('STU-005');
      expect(student.id).toBe('sabc1234');
      const lock = client.query.mock.calls.find(c => c[0].includes('pg_advisory_xact_lock'));
      expect(lock).toBeDefined(); // code numbering is serialised
    });

    it('normalizes gender, defaults status and trims values', async () => {
      const client = makeClient();
      db.pool.connect.mockResolvedValue(client);
      await service.createStudent({ name: '  Test  ', guardian: ' G ', phone: ' P ' });
      const insert = client.query.mock.calls.find(c => c[0].includes('INSERT INTO students')) as any[];
      expect(insert[1]).toEqual([expect.any(String), 'STU-005', 'Test', 'Female', null, null, 'Active', 'G', 'P', '']);
    });

    it('rolls back and rethrows on failure', async () => {
      const client = makeClient();
      client.query.mockImplementation(async (q: string) => {
        if (q.includes('INSERT INTO students')) throw new Error('duplicate key');
        if (q === 'BEGIN' || q === 'COMMIT' || q === 'ROLLBACK') return {};
        if (q.includes('pg_advisory_xact_lock')) return {};
        if (q.includes('COALESCE(MAX')) return { rows: [{ n: 1 }] };
        return {};
      });
      db.pool.connect.mockResolvedValue(client);
      await expect(service.createStudent(valid)).rejects.toThrow('duplicate key');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });

    it('invalidates the students cache after create', async () => {
      db.pool.connect.mockResolvedValue(makeClient());
      await service.createStudent(valid);
      expect(redis.del).toHaveBeenCalledWith('sala:students');
    });
  });

  describe('caching', () => {
    it('serves the list from the Redis cache without hitting the DB', async () => {
      redis.get.mockResolvedValue(JSON.stringify([{ id: 's1', code: 'STU-001' }]));
      const list = await service.listStudents();
      expect(list).toEqual([{ id: 's1', code: 'STU-001' }]);
      expect(db.pool.query).not.toHaveBeenCalled();
    });

    it('falls back to the DB and fills the cache', async () => {
      db.pool.query.mockResolvedValue({ rows: [{ id: 's1', code: 'STU-001' }] });
      const list = await service.listStudents();
      expect(list).toEqual([{ id: 's1', code: 'STU-001' }]);
      expect(redis.set).toHaveBeenCalledWith('sala:students', JSON.stringify([{ id: 's1', code: 'STU-001' }]));
    });

    it('invalidates the cache on update and delete', async () => {
      db.pool.query.mockResolvedValue({ rows: [{ id: 's1' }], rowCount: 1 });
      await service.updateStudent('s1', valid);
      await service.deleteStudent('s1');
      await service.deleteAllStudents();
      expect(redis.del).toHaveBeenCalledTimes(3);
    });

    it('updateStudent returns null when the student is missing', async () => {
      db.pool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(service.updateStudent('nope', valid)).resolves.toBeNull();
    });

    it('deleteStudent returns whether a row was removed', async () => {
      db.pool.query.mockResolvedValue({ rowCount: 1 });
      await expect(service.deleteStudent('s1')).resolves.toBe(true);
      db.pool.query.mockResolvedValue({ rowCount: 0 });
      await expect(service.deleteStudent('s1')).resolves.toBe(false);
    });
  });

  describe('getStudent', () => {
    it('queries the database directly by id', async () => {
      db.pool.query.mockResolvedValue({ rows: [{ id: 's1', code: 'STU-001' }] });
      const s = await service.getStudent('s1');
      expect(db.pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), ['s1']);
      expect(s).toEqual({ id: 's1', code: 'STU-001' });
    });

    it('returns null when not found', async () => {
      db.pool.query.mockResolvedValue({ rows: [] });
      await expect(service.getStudent('nope')).resolves.toBeNull();
    });
  });
});
