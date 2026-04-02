import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { ChatCacheService } from './chat-cache.service';

describe('ChatCacheService', () => {
  let service: ChatCacheService;
  let cacheService: {
    getOrSet: ReturnType<typeof mock>;
    get: ReturnType<typeof mock>;
    set: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };

  beforeEach(async () => {
    cacheService = {
      getOrSet: mock(),
      get: mock(),
      set: mock(),
      delete: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatCacheService, { provide: CacheService, useValue: cacheService }],
    }).compile();

    service = module.get<ChatCacheService>(ChatCacheService);
  });

  describe('getUnreadCount', () => {
    it('should call cache.getOrSet with correct key and TTL', async () => {
      const computeFn = mock(() =>
        Promise.resolve({ totalUnread: 5, byConversation: { conv1: 5 } }),
      );
      cacheService.getOrSet.mockImplementation((_key: string, fn: () => Promise<unknown>) => fn());

      await service.getUnreadCount('user-123', computeFn);

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'chat:unread:user-123',
        expect.any(Function),
        30, // UNREAD_TTL
      );
    });

    it('should return cached value when available', async () => {
      const cachedValue = { totalUnread: 10, byConversation: { conv1: 5, conv2: 5 } };
      cacheService.getOrSet.mockResolvedValue(cachedValue);

      const result = await service.getUnreadCount('user-123', async () => cachedValue);

      expect(result).toEqual(cachedValue);
    });

    it('should compute and cache value when not in cache', async () => {
      const computedValue = { totalUnread: 3, byConversation: { conv1: 3 } };
      const computeFn = mock(() => Promise.resolve(computedValue));
      cacheService.getOrSet.mockImplementation((_key: string, fn: () => Promise<unknown>) => fn());

      const result = await service.getUnreadCount('user-123', computeFn);

      expect(result).toEqual(computedValue);
      expect(computeFn).toHaveBeenCalled();
    });
  });

  describe('invalidateUnread', () => {
    it('should delete unread cache for user', async () => {
      cacheService.delete.mockResolvedValue(undefined);

      await service.invalidateUnread('user-123');

      expect(cacheService.delete).toHaveBeenCalledWith('chat:unread:user-123');
    });
  });

  describe('getConversations', () => {
    it('should call cache.getOrSet with correct key and TTL', async () => {
      const computeFn = mock(() => Promise.resolve([{ id: 'conv1' }]));
      cacheService.getOrSet.mockImplementation((_key: string, fn: () => Promise<unknown>) => fn());

      await service.getConversations('user-123', computeFn);

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'chat:convs:user-123',
        expect.any(Function),
        60, // CONVERSATIONS_TTL
      );
    });

    it('should return cached conversations when available', async () => {
      const cachedConversations = [{ id: 'conv1' }, { id: 'conv2' }];
      cacheService.getOrSet.mockResolvedValue(cachedConversations);

      const result = await service.getConversations('user-123', async () => cachedConversations);

      expect(result).toEqual(cachedConversations);
    });
  });

  describe('invalidateConversations', () => {
    it('should delete conversations cache for user', async () => {
      cacheService.delete.mockResolvedValue(undefined);

      await service.invalidateConversations('user-123');

      expect(cacheService.delete).toHaveBeenCalledWith('chat:convs:user-123');
    });
  });

  describe('setOnlineStatus', () => {
    it('should set online status with correct TTL', async () => {
      cacheService.set.mockResolvedValue(undefined);

      await service.setOnlineStatus('user-123', true);

      expect(cacheService.set).toHaveBeenCalledWith(
        'chat:online:user-123',
        expect.objectContaining({
          isOnline: true,
          lastSeen: expect.any(String),
        }),
        120, // ONLINE_TTL
      );
    });

    it('should set offline status', async () => {
      cacheService.set.mockResolvedValue(undefined);

      await service.setOnlineStatus('user-123', false);

      expect(cacheService.set).toHaveBeenCalledWith(
        'chat:online:user-123',
        expect.objectContaining({
          isOnline: false,
          lastSeen: expect.any(String),
        }),
        120,
      );
    });

    it('should include ISO timestamp in lastSeen', async () => {
      cacheService.set.mockResolvedValue(undefined);
      const before = new Date().toISOString();

      await service.setOnlineStatus('user-123', true);

      const after = new Date().toISOString();
      const callArg = cacheService.set.mock.calls[0][1] as {
        isOnline: boolean;
        lastSeen: string;
      };
      expect(callArg.lastSeen >= before).toBe(true);
      expect(callArg.lastSeen <= after).toBe(true);
    });
  });

  describe('getOnlineStatus', () => {
    it('should return online status when cached', async () => {
      const status = { isOnline: true, lastSeen: '2024-01-01T00:00:00.000Z' };
      cacheService.get.mockResolvedValue(status);

      const result = await service.getOnlineStatus('user-123');

      expect(result).toEqual(status);
      expect(cacheService.get).toHaveBeenCalledWith('chat:online:user-123');
    });

    it('should return null when not cached', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await service.getOnlineStatus('user-123');

      expect(result).toBeNull();
    });
  });

  describe('invalidateAllForUser', () => {
    it('should invalidate both unread and conversations caches', async () => {
      cacheService.delete.mockResolvedValue(undefined);

      await service.invalidateAllForUser('user-123');

      expect(cacheService.delete).toHaveBeenCalledTimes(2);
      expect(cacheService.delete).toHaveBeenCalledWith('chat:unread:user-123');
      expect(cacheService.delete).toHaveBeenCalledWith('chat:convs:user-123');
    });

    it('should execute invalidations in parallel', async () => {
      let resolveCount = 0;
      cacheService.delete.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolveCount++;
            resolve(undefined);
          }, 10);
        });
      });

      const startTime = Date.now();
      await service.invalidateAllForUser('user-123');
      const elapsed = Date.now() - startTime;

      // If executed in parallel, should take ~10ms, not ~20ms
      expect(elapsed).toBeLessThan(30);
      expect(resolveCount).toBe(2);
    });
  });

  describe('cache key generation', () => {
    it('should generate unique keys for different users', async () => {
      cacheService.getOrSet.mockResolvedValue({ totalUnread: 0, byConversation: {} });

      await service.getUnreadCount('user-1', async () => ({
        totalUnread: 0,
        byConversation: {},
      }));
      await service.getUnreadCount('user-2', async () => ({
        totalUnread: 0,
        byConversation: {},
      }));

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'chat:unread:user-1',
        expect.any(Function),
        30,
      );
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'chat:unread:user-2',
        expect.any(Function),
        30,
      );
    });

    it('should handle special characters in userId', async () => {
      cacheService.get.mockResolvedValue(null);

      await service.getOnlineStatus('user-with-special-chars-123');

      expect(cacheService.get).toHaveBeenCalledWith('chat:online:user-with-special-chars-123');
    });
  });
});
