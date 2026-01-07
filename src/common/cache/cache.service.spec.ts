/**
 * CacheService Tests (Adapter)
 *
 * NOTA (Uncle Bob): CacheService é um adapter para Redis.
 * Testes focam em comportamento observável (valores retornados, estado).
 * Testes detalhados de implementação estão nos serviços especializados.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { CacheCoreService } from './services/cache-core.service';
import { CachePatternsService } from './services/cache-patterns.service';
import { RedisConnectionService } from './redis-connection.service';

describe('CacheService (Adapter)', () => {
  let service: CacheService;

  // In-memory fake para simular comportamento de cache
  const cacheStore = new Map<string, unknown>();
  const lockStore = new Set<string>();

  const createStubs = (enabled: boolean) => ({
    coreService: {
      get: mock((key: string) =>
        Promise.resolve(cacheStore.get(key) ?? null),
      ),
      set: mock((key: string, value: unknown) => {
        cacheStore.set(key, value);
        return Promise.resolve();
      }),
      delete: mock((key: string) => {
        cacheStore.delete(key);
        return Promise.resolve();
      }),
      deletePattern: mock((pattern: string) => {
        const prefix = pattern.replace('*', '');
        for (const key of cacheStore.keys()) {
          if (key.startsWith(prefix)) cacheStore.delete(key);
        }
        return Promise.resolve();
      }),
      flush: mock(() => {
        cacheStore.clear();
        return Promise.resolve();
      }),
      isEnabled: enabled,
    },
    patternsService: {
      acquireLock: mock((key: string) => {
        if (lockStore.has(key)) return Promise.resolve(false);
        lockStore.add(key);
        return Promise.resolve(true);
      }),
      releaseLock: mock((key: string) => {
        lockStore.delete(key);
        return Promise.resolve();
      }),
      isLocked: mock((key: string) => Promise.resolve(lockStore.has(key))),
      getOrSet: mock(
        async <T>(key: string, computeFn: () => Promise<T>, _ttl?: number) => {
          const cached = cacheStore.get(key) as T | undefined;
          if (cached !== undefined) return cached;
          const value = await computeFn();
          cacheStore.set(key, value);
          return value;
        },
      ),
    },
    redisConnection: {
      onModuleDestroy: mock().mockResolvedValue(undefined),
      client: null,
    },
  });

  beforeEach(async () => {
    cacheStore.clear();
    lockStore.clear();

    const stubs = createStubs(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: CacheCoreService, useValue: stubs.coreService },
        { provide: CachePatternsService, useValue: stubs.patternsService },
        { provide: RedisConnectionService, useValue: stubs.redisConnection },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  describe('when Redis is enabled', () => {
    it('should report enabled status', () => {
      expect(service.isEnabled).toBe(true);
    });

    describe('get/set operations', () => {
      it('should return null for non-existent key', async () => {
        const result = await service.get('missing-key');

        expect(result).toBeNull();
      });

      it('should return stored value after set', async () => {
        const testData = { name: 'test', value: 123 };

        await service.set('test-key', testData);
        const result = await service.get<typeof testData>('test-key');

        expect(result).toEqual(testData);
      });

      it('should return null after delete', async () => {
        await service.set('test-key', { data: 'value' });
        await service.delete('test-key');

        const result = await service.get('test-key');

        expect(result).toBeNull();
      });
    });

    describe('deletePattern', () => {
      it('should delete all keys matching pattern', async () => {
        await service.set('user:1', { id: 1 });
        await service.set('user:2', { id: 2 });
        await service.set('other:1', { id: 'other' });

        await service.deletePattern('user:*');

        expect(await service.get('user:1')).toBeNull();
        expect(await service.get('user:2')).toBeNull();
        expect(await service.get('other:1')).not.toBeNull();
      });
    });

    describe('flush', () => {
      it('should clear all cached data', async () => {
        await service.set('key1', 'value1');
        await service.set('key2', 'value2');

        await service.flush();

        expect(await service.get('key1')).toBeNull();
        expect(await service.get('key2')).toBeNull();
      });
    });

    describe('lock operations', () => {
      it('should acquire lock when not locked', async () => {
        const acquired = await service.acquireLock('resource:1', 60);

        expect(acquired).toBe(true);
      });

      it('should fail to acquire lock when already locked', async () => {
        await service.acquireLock('resource:1', 60);

        const secondAcquire = await service.acquireLock('resource:1', 60);

        expect(secondAcquire).toBe(false);
      });

      it('should allow acquire after release', async () => {
        await service.acquireLock('resource:1', 60);
        await service.releaseLock('resource:1');

        const acquired = await service.acquireLock('resource:1', 60);

        expect(acquired).toBe(true);
      });

      it('should report correct lock status', async () => {
        expect(await service.isLocked('resource:1')).toBe(false);

        await service.acquireLock('resource:1', 60);

        expect(await service.isLocked('resource:1')).toBe(true);

        await service.releaseLock('resource:1');

        expect(await service.isLocked('resource:1')).toBe(false);
      });
    });

    describe('getOrSet (cache-aside pattern)', () => {
      it('should compute and cache value on cache miss', async () => {
        const computeFn = mock().mockResolvedValue('computed-value');

        const result = await service.getOrSet('cache-key', computeFn, 60);

        expect(result).toBe('computed-value');
        expect(computeFn).toHaveBeenCalledTimes(1);
      });

      it('should return cached value without computing on cache hit', async () => {
        const computeFn = mock().mockResolvedValue('new-value');

        // Prime the cache
        await service.set('cache-key', 'cached-value');

        const result = await service.getOrSet('cache-key', computeFn, 60);

        expect(result).toBe('cached-value');
        expect(computeFn).not.toHaveBeenCalled();
      });
    });

    describe('onModuleDestroy', () => {
      it('should complete cleanup without error', async () => {
        await expect(service.onModuleDestroy()).resolves.toBeUndefined();
      });
    });
  });

  describe('when Redis is disabled', () => {
    let disabledService: CacheService;

    beforeEach(async () => {
      const stubs = createStubs(false);
      // Override get to always return null when disabled
      stubs.coreService.get = mock().mockResolvedValue(null);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          { provide: CacheCoreService, useValue: stubs.coreService },
          { provide: CachePatternsService, useValue: stubs.patternsService },
          { provide: RedisConnectionService, useValue: stubs.redisConnection },
        ],
      }).compile();

      disabledService = module.get<CacheService>(CacheService);
    });

    it('should report disabled status', () => {
      expect(disabledService.isEnabled).toBe(false);
    });

    it('should return null for get operations', async () => {
      const result = await disabledService.get('any-key');

      expect(result).toBeNull();
    });
  });
});
