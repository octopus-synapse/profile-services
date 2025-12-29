/* eslint-disable @typescript-eslint/unbound-method */
import { AppLoggerService } from '../logger/logger.service';

// Create a mock Redis client that we can control
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  flushdb: jest.fn(),
  exists: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

// Mock ioredis before importing CacheService
// Need to mock as default export for ES module compatibility
jest.mock('ioredis', () => {
  return {
    default: jest.fn(() => mockRedis),
    __esModule: true,
  };
});

// Import after mock setup
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let mockLogger: jest.Mocked<AppLoggerService>;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset mock implementations
    mockRedis.get.mockReset();
    mockRedis.set.mockReset();
    mockRedis.setex.mockReset();
    mockRedis.del.mockReset();
    mockRedis.keys.mockReset();
    mockRedis.flushdb.mockReset();
    mockRedis.exists.mockReset();
    mockRedis.quit.mockReset();
    mockRedis.on.mockReset();

    // Create fresh logger mock
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<AppLoggerService>;

    // Reset process.env
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('when Redis is configured', () => {
    let service: CacheService;

    beforeEach(() => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      process.env.REDIS_PASSWORD = 'test-password';
      service = new CacheService(mockLogger);
    });

    it('should be enabled', () => {
      expect(service.isEnabled).toBe(true);
    });

    it('should register event handlers on Redis client', () => {
      expect(mockRedis.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    describe('get', () => {
      it('should return parsed value when key exists', async () => {
        const testData = { name: 'test', value: 123 };
        mockRedis.get.mockResolvedValue(JSON.stringify(testData));

        const result = await service.get<typeof testData>('test-key');

        expect(result).toEqual(testData);
        expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      });

      it('should return null when key does not exist', async () => {
        mockRedis.get.mockResolvedValue(null);

        const result = await service.get('non-existent-key');

        expect(result).toBeNull();
      });

      it('should return null on error and log', async () => {
        mockRedis.get.mockRejectedValue(new Error('Connection error'));

        const result = await service.get('test-key');

        expect(result).toBeNull();
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    describe('set', () => {
      it('should set value without TTL', async () => {
        mockRedis.set.mockResolvedValue('OK');

        await service.set('test-key', { data: 'value' });

        expect(mockRedis.set).toHaveBeenCalledWith(
          'test-key',
          JSON.stringify({ data: 'value' }),
        );
      });

      it('should set value with TTL using setex', async () => {
        mockRedis.setex.mockResolvedValue('OK');

        await service.set('test-key', { data: 'value' }, 300);

        expect(mockRedis.setex).toHaveBeenCalledWith(
          'test-key',
          300,
          JSON.stringify({ data: 'value' }),
        );
      });

      it('should log error on failure', async () => {
        mockRedis.set.mockRejectedValue(new Error('Set failed'));

        await service.set('test-key', 'value');

        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    describe('delete', () => {
      it('should delete key', async () => {
        mockRedis.del.mockResolvedValue(1);

        await service.delete('test-key');

        expect(mockRedis.del).toHaveBeenCalledWith('test-key');
      });

      it('should log error on failure', async () => {
        mockRedis.del.mockRejectedValue(new Error('Delete failed'));

        await service.delete('test-key');

        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    describe('deletePattern', () => {
      it('should delete keys matching pattern', async () => {
        mockRedis.keys.mockResolvedValue(['key1', 'key2', 'key3']);
        mockRedis.del.mockResolvedValue(3);

        await service.deletePattern('user:*');

        expect(mockRedis.keys).toHaveBeenCalledWith('user:*');
        expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
      });

      it('should not call del when no keys match', async () => {
        mockRedis.keys.mockResolvedValue([]);

        await service.deletePattern('user:*');

        expect(mockRedis.keys).toHaveBeenCalledWith('user:*');
        expect(mockRedis.del).not.toHaveBeenCalled();
      });
    });

    describe('flush', () => {
      it('should flush database', async () => {
        mockRedis.flushdb.mockResolvedValue('OK');

        await service.flush();

        expect(mockRedis.flushdb).toHaveBeenCalled();
      });
    });

    describe('acquireLock', () => {
      it('should acquire lock successfully', async () => {
        mockRedis.set.mockResolvedValue('OK');

        const result = await service.acquireLock('lock:resource', 60);

        expect(result).toBe(true);
        expect(mockRedis.set).toHaveBeenCalledWith(
          'lock:resource',
          expect.any(String),
          'EX',
          60,
          'NX',
        );
      });

      it('should return false when lock already exists', async () => {
        mockRedis.set.mockResolvedValue(null);

        const result = await service.acquireLock('lock:resource', 60);

        expect(result).toBe(false);
      });

      it('should return false on error', async () => {
        mockRedis.set.mockRejectedValue(new Error('Lock failed'));

        const result = await service.acquireLock('lock:resource', 60);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    describe('isLocked', () => {
      it('should return true when lock exists', async () => {
        mockRedis.exists.mockResolvedValue(1);

        const result = await service.isLocked('lock:resource');

        expect(result).toBe(true);
        expect(mockRedis.exists).toHaveBeenCalledWith('lock:resource');
      });

      it('should return false when lock does not exist', async () => {
        mockRedis.exists.mockResolvedValue(0);

        const result = await service.isLocked('lock:resource');

        expect(result).toBe(false);
      });
    });

    describe('onModuleDestroy', () => {
      it('should close Redis connection', async () => {
        mockRedis.quit.mockResolvedValue('OK');

        await service.onModuleDestroy();

        expect(mockRedis.quit).toHaveBeenCalled();
      });
    });
  });

  describe('when Redis is not configured', () => {
    let service: CacheService;

    beforeEach(() => {
      // Ensure REDIS_HOST is not set
      delete process.env.REDIS_HOST;
      service = new CacheService(mockLogger);
    });

    it('should be disabled', () => {
      expect(service.isEnabled).toBe(false);
    });

    it('should log warning on initialization', () => {
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Redis not configured - caching disabled',
        'CacheService',
      );
    });

    it('should return null from get', async () => {
      const result = await service.get('test-key');
      expect(result).toBeNull();
    });

    it('should do nothing on set', async () => {
      await service.set('test-key', 'value');
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should do nothing on delete', async () => {
      await service.delete('test-key');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should return true for acquireLock (allow operation without coordination)', async () => {
      const result = await service.acquireLock('lock:resource', 60);
      expect(result).toBe(true);
    });

    it('should return false for isLocked', async () => {
      const result = await service.isLocked('lock:resource');
      expect(result).toBe(false);
    });
  });
});
