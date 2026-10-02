import { Test } from '@nestjs/testing';
import { SchoolDataService } from './school-data.service';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { ValidationException } from '../common/api-exceptions.filter';

const mockDb = () => ({
  saveData: jest.fn().mockResolvedValue(undefined),
  importStudents: jest.fn().mockResolvedValue(1),
  loadData: jest.fn().mockResolvedValue(null),
});
const mockRedis = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
});

const settings = { school: 'Sala Secondary School', passMark: 40 };

describe('SchoolDataService', () => {
  let service: SchoolDataService;
  let db: ReturnType<typeof mockDb>;
  let redis: ReturnType<typeof mockRedis>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SchoolDataService,
        { provide: DatabaseService, useFactory: mockDb },
        { provide: RedisService, useFactory: mockRedis },
      ],
    }).compile();
    service = moduleRef.get(SchoolDataService);
    db = moduleRef.get(DatabaseService);
    redis = moduleRef.get(RedisService);
  });

  describe('save', () => {
    it('rejects payloads without settings (400, like the original API)', async () => {
      await expect(service.save({} as any)).rejects.toThrow(new ValidationException('Invalid data'));
      await expect(service.save(null as any)).rejects.toThrow(ValidationException);
      await expect(service.save({ foo: 1 } as any)).rejects.toThrow('Invalid data');
      expect(db.saveData).not.toHaveBeenCalled();
    });

    it('strips students from the saved document', async () => {
      // The stripping itself happens in DatabaseService.saveData (covered in
      // database.service.spec); the service passes the payload through.
      await service.save({ settings, students: [] } as any);
      expect(db.saveData).toHaveBeenCalledWith({ settings, students: [] });
    });

    it('imports a students array on save (first-run browser import)', async () => {
      const students = [{ id: 's1', code: 'STU-001', name: 'A' }];
      await service.save({ settings, students } as any);
      expect(db.importStudents).toHaveBeenCalledWith(students);
    });

    it('skips the import for an empty students array', async () => {
      await service.save({ settings, students: [] } as any);
      expect(db.importStudents).not.toHaveBeenCalled();
    });

    it('invalidates the school data cache after save', async () => {
      await service.save({ settings } as any);
      expect(redis.del).toHaveBeenCalledWith('sala:data');
    });
  });

  describe('load', () => {
    it('serves from the Redis cache without hitting the DB', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ settings }));
      const data = await service.load();
      expect(data).toEqual({ settings });
      expect(db.loadData).not.toHaveBeenCalled();
    });

    it('falls back to the DB and fills the cache', async () => {
      db.loadData.mockResolvedValue({ settings });
      const data = await service.load();
      expect(data).toEqual({ settings });
      expect(redis.set).toHaveBeenCalledWith('sala:data', JSON.stringify({ settings }));
    });

    it('does not cache a null document', async () => {
      db.loadData.mockResolvedValue(null);
      await expect(service.load()).resolves.toBeNull();
      expect(redis.set).not.toHaveBeenCalled();
    });
  });
});
