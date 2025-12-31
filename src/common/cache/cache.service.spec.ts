import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { CacheCoreService } from './services/cache-core.service';
import { CachePatternsService } from './services/cache-patterns.service';
import { RedisConnectionService } from './redis-connection.service';

describe('CacheService', () => {
  let service: CacheService;
  let coreService: jest.Mocked<CacheCoreService>;
  let patternsService: jest.Mocked<CachePatternsService>;
  let redisConnection: jest.Mocked<RedisConnectionService>;

  beforeEach(async () => {
    const mockCoreService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deletePattern: jest.fn(),
      flush: jest.fn(),
      isEnabled: true,
    };

    const mockPatternsService = {
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
      isLocked: jest.fn(),
      getOrSet: jest.fn(),
    };

    const mockRedisConnection = {
      onModuleDestroy: jest.fn(),
      client: null,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CacheCoreService,
          useValue: mockCoreService,
        },
        {
          provide: CachePatternsService,
          useValue: mockPatternsService,
        },
        {
          provide: RedisConnectionService,
          useValue: mockRedisConnection,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    coreService = module.get(CacheCoreService);
    patternsService = module.get(CachePatternsService);
    redisConnection = module.get(RedisConnectionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when Redis is configured', () => {
    it('should be enabled', () => {
      expect(service.isEnabled).toBe(true);
    });

    describe('get', () => {
      it('should return parsed value when key exists', async () => {
        const testData = { name: 'test', value: 123 };
        coreService.get.mockResolvedValue(testData);

        const result = await service.get<typeof testData>('test-key');

        expect(result).toEqual(testData);
        expect(coreService.get).toHaveBeenCalledWith('test-key');
      });

      it('should return null when key does not exist', async () => {
        coreService.get.mockResolvedValue(null);

        const result = await service.get('non-existent-key');

        expect(result).toBeNull();
      });
    });

    describe('set', () => {
      it('should set value without TTL', async () => {
        coreService.set.mockResolvedValue(undefined);

        await service.set('test-key', { data: 'value' });

        expect(coreService.set).toHaveBeenCalledWith(
          'test-key',
          { data: 'value' },
          undefined,
        );
      });

      it('should set value with TTL', async () => {
        coreService.set.mockResolvedValue(undefined);

        await service.set('test-key', { data: 'value' }, 300);

        expect(coreService.set).toHaveBeenCalledWith(
          'test-key',
          { data: 'value' },
          300,
        );
      });
    });

    describe('delete', () => {
      it('should delete key', async () => {
        coreService.delete.mockResolvedValue(undefined);

        await service.delete('test-key');

        expect(coreService.delete).toHaveBeenCalledWith('test-key');
      });
    });

    describe('deletePattern', () => {
      it('should delete keys matching pattern', async () => {
        coreService.deletePattern.mockResolvedValue(undefined);

        await service.deletePattern('user:*');

        expect(coreService.deletePattern).toHaveBeenCalledWith('user:*');
      });
    });

    describe('flush', () => {
      it('should flush database', async () => {
        coreService.flush.mockResolvedValue(undefined);

        await service.flush();

        expect(coreService.flush).toHaveBeenCalled();
      });
    });

    describe('acquireLock', () => {
      it('should acquire lock successfully', async () => {
        patternsService.acquireLock.mockResolvedValue(true);

        const result = await service.acquireLock('lock:resource', 60);

        expect(result).toBe(true);
        expect(patternsService.acquireLock).toHaveBeenCalledWith(
          'lock:resource',
          60,
        );
      });

      it('should return false when lock already exists', async () => {
        patternsService.acquireLock.mockResolvedValue(false);

        const result = await service.acquireLock('lock:resource', 60);

        expect(result).toBe(false);
      });
    });

    describe('releaseLock', () => {
      it('should release lock', async () => {
        patternsService.releaseLock.mockResolvedValue(undefined);

        await service.releaseLock('lock:resource');

        expect(patternsService.releaseLock).toHaveBeenCalledWith(
          'lock:resource',
        );
      });
    });

    describe('isLocked', () => {
      it('should return true when lock exists', async () => {
        patternsService.isLocked.mockResolvedValue(true);

        const result = await service.isLocked('lock:resource');

        expect(result).toBe(true);
        expect(patternsService.isLocked).toHaveBeenCalledWith('lock:resource');
      });

      it('should return false when lock does not exist', async () => {
        patternsService.isLocked.mockResolvedValue(false);

        const result = await service.isLocked('lock:resource');

        expect(result).toBe(false);
      });
    });

    describe('getOrSet', () => {
      it('should get or set value', async () => {
        const computeFn = jest.fn().mockResolvedValue('computed-value');
        patternsService.getOrSet.mockResolvedValue('computed-value');

        const result = await service.getOrSet('test-key', computeFn, 60);

        expect(result).toBe('computed-value');
        expect(patternsService.getOrSet).toHaveBeenCalledWith(
          'test-key',
          computeFn,
          60,
        );
      });
    });

    describe('onModuleDestroy', () => {
      it('should close Redis connection', async () => {
        redisConnection.onModuleDestroy.mockResolvedValue(undefined);

        await service.onModuleDestroy();

        expect(redisConnection.onModuleDestroy).toHaveBeenCalled();
      });
    });
  });

  describe('when Redis is not configured', () => {
    let disabledService: CacheService;

    beforeEach(async () => {
      const mockCoreServiceDisabled = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        deletePattern: jest.fn(),
        flush: jest.fn(),
        isEnabled: false,
      };

      const mockPatternsService = {
        acquireLock: jest.fn(),
        releaseLock: jest.fn(),
        isLocked: jest.fn(),
        getOrSet: jest.fn(),
      };

      const mockRedisConnection = {
        onModuleDestroy: jest.fn(),
        client: null,
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: CacheCoreService,
            useValue: mockCoreServiceDisabled,
          },
          {
            provide: CachePatternsService,
            useValue: mockPatternsService,
          },
          {
            provide: RedisConnectionService,
            useValue: mockRedisConnection,
          },
        ],
      }).compile();

      disabledService = module.get<CacheService>(CacheService);
    });

    it('should be disabled', () => {
      expect(disabledService.isEnabled).toBe(false);
    });

    it('should return null from get', async () => {
      const mockCoreServiceDisabled = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn(),
        delete: jest.fn(),
        deletePattern: jest.fn(),
        flush: jest.fn(),
        isEnabled: false,
      };

      // Recreate service with disabled mock
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: CacheCoreService,
            useValue: mockCoreServiceDisabled,
          },
          {
            provide: CachePatternsService,
            useValue: {
              acquireLock: jest.fn(),
              releaseLock: jest.fn(),
              isLocked: jest.fn(),
              getOrSet: jest.fn(),
            },
          },
          {
            provide: RedisConnectionService,
            useValue: {
              onModuleDestroy: jest.fn(),
              client: null,
            },
          },
        ],
      }).compile();

      const testService = module.get<CacheService>(CacheService);
      const result = await testService.get('test-key');
      expect(result).toBeNull();
    });
  });
});
