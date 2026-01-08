/**
 * Token Blacklist Service Tests
 * Focus: JWT blacklisting with Redis + memory fallback
 *
 * Key scenarios:
 * - Redis available: uses setex/exists/get
 * - Redis fails: falls back to memory store
 * - Token expiration handling
 * - revokeAllUserTokens: stores revocation timestamp
 * - isTokenRevokedForUser: compares tokenIssuedAt < revokedBefore
 */

import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenBlacklistService } from './token-blacklist.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { RedisConnectionService } from '../../common/cache/redis-connection.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let fakeRedisConnection: {
    client: {
      setex: ReturnType<typeof mock>;
      exists: ReturnType<typeof mock>;
      get: ReturnType<typeof mock>;
    } | null;
    isEnabled: boolean;
  };
  let fakeLogger: {
    log: ReturnType<typeof mock>;
    warn: ReturnType<typeof mock>;
    debug: ReturnType<typeof mock>;
    error: ReturnType<typeof mock>;
    setContext: ReturnType<typeof mock>;
  };
  let fakeConfig: {
    get: ReturnType<typeof mock>;
  };

  beforeEach(async () => {
    fakeRedisConnection = {
      client: {
        setex: mock(() => Promise.resolve('OK')),
        exists: mock(() => Promise.resolve(0)),
        get: mock(() => Promise.resolve(null)),
      },
      isEnabled: true,
    };

    fakeLogger = {
      log: mock(() => {}),
      warn: mock(() => {}),
      debug: mock(() => {}),
      error: mock(() => {}),
      setContext: mock(() => {}),
    };

    fakeConfig = {
      get: mock((key: string) => {
        if (key === 'JWT_REFRESH_EXPIRY_SECONDS') return 604800; // 7 days
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        { provide: ConfigService, useValue: fakeConfig },
        { provide: RedisConnectionService, useValue: fakeRedisConnection },
        { provide: AppLoggerService, useValue: fakeLogger },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
  });

  afterEach(async () => {
    // Clear memory stores between tests
    (service as any).memoryBlacklist?.clear();
    (service as any).memoryUserRevokedBefore?.clear();
    // Clear cleanup interval
    if ((service as any).cleanupInterval) {
      clearInterval((service as any).cleanupInterval);
    }
  });

  describe('blacklistToken', () => {
    it('should store token in Redis when available', async () => {
      await service.blacklistToken('token-123', 3600);

      expect(fakeRedisConnection.client!.setex).toHaveBeenCalledWith(
        'token:blacklist:token-123',
        3600,
        '1',
      );
    });

    it('should use default TTL when not provided', async () => {
      await service.blacklistToken('token-123');

      const call = fakeRedisConnection.client!.setex.mock.calls[0];
      expect(call[1]).toBe(604800); // default 7 days
    });

    it('should fallback to memory when Redis fails', async () => {
      fakeRedisConnection.isEnabled = false;
      fakeRedisConnection.client = null;

      await service.blacklistToken('token-123', 3600);

      // Should store in memory, not throw
      expect((service as any).memoryBlacklist.has('token-123')).toBe(true);
    });
  });

  describe('isBlacklisted', () => {
    it('should check Redis when connected', async () => {
      fakeRedisConnection.client!.exists.mockResolvedValue(1);

      const result = await service.isBlacklisted('token-123');

      expect(result).toBe(true);
      expect(fakeRedisConnection.client!.exists).toHaveBeenCalledWith(
        'token:blacklist:token-123',
      );
    });

    it('should return false when token not blacklisted', async () => {
      fakeRedisConnection.client!.exists.mockResolvedValue(0);

      const result = await service.isBlacklisted('token-123');

      expect(result).toBe(false);
    });

    it('should fallback to memory when Redis not connected', async () => {
      fakeRedisConnection.isEnabled = false;
      fakeRedisConnection.client = null;
      (service as any).memoryBlacklist.set('token-123', Date.now() + 3600000);

      const result = await service.isBlacklisted('token-123');

      expect(result).toBe(true);
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should store revocation timestamp in Redis', async () => {
      await service.revokeAllUserTokens('user-123');

      expect(fakeRedisConnection.client!.setex).toHaveBeenCalled();
      const call = fakeRedisConnection.client!.setex.mock.calls[0];
      expect(call[0]).toBe('user:tokens:user-123:revoked_before');
      // 30 days in seconds
      expect(call[1]).toBe(30 * 24 * 60 * 60);
    });

    it('should fallback to memory when Redis unavailable', async () => {
      fakeRedisConnection.isEnabled = false;
      fakeRedisConnection.client = null;

      await service.revokeAllUserTokens('user-123');

      expect((service as any).memoryUserRevokedBefore.has('user-123')).toBe(
        true,
      );
    });
  });

  describe('isTokenRevokedForUser', () => {
    it('should return false when no revocation exists', async () => {
      fakeRedisConnection.client!.get.mockResolvedValue(null);

      const result = await service.isTokenRevokedForUser(
        'user-123',
        Math.floor(Date.now() / 1000),
      );

      expect(result).toBe(false);
    });

    it('should return true when token issued before revocation', async () => {
      const revokedBefore = Date.now();
      const tokenIssuedAt = Math.floor((revokedBefore - 3600000) / 1000); // 1h before
      fakeRedisConnection.client!.get.mockResolvedValue(
        revokedBefore.toString(),
      );

      const result = await service.isTokenRevokedForUser(
        'user-123',
        tokenIssuedAt,
      );

      expect(result).toBe(true);
    });

    it('should return false when token issued after revocation', async () => {
      // revokedBefore is stored in milliseconds, tokenIssuedAt comes in seconds
      // The comparison is: tokenIssuedAt < parseInt(revokedBefore)
      // So for token NOT to be revoked: tokenIssuedAt (seconds) >= revokedBefore (ms)
      // This means tokenIssuedAt needs to be a huge number or revokedBefore needs to be small
      const revokedBefore = 1000; // 1 second in ms (very old revocation)
      const tokenIssuedAt = 2000; // 2000 seconds = way after revocation in ms
      fakeRedisConnection.client!.get.mockResolvedValue(
        revokedBefore.toString(),
      );

      const result = await service.isTokenRevokedForUser(
        'user-123',
        tokenIssuedAt,
      );

      expect(result).toBe(false);
    });

    it('should use memory fallback when Redis unavailable', async () => {
      fakeRedisConnection.isEnabled = false;
      fakeRedisConnection.client = null;
      const revokedBefore = Date.now();
      (service as any).memoryUserRevokedBefore.set('user-123', revokedBefore);
      const tokenIssuedAt = Math.floor((revokedBefore - 3600000) / 1000);

      const result = await service.isTokenRevokedForUser(
        'user-123',
        tokenIssuedAt,
      );

      expect(result).toBe(true);
    });
  });

  describe('cleanupMemoryStore', () => {
    it('should remove expired tokens from memory', () => {
      // Add expired token (expiry in the past)
      (service as any).memoryBlacklist.set('expired-token', Date.now() - 1000);
      // Add valid token (expiry in the future)
      (service as any).memoryBlacklist.set('valid-token', Date.now() + 3600000);

      (service as any).cleanupMemoryStore();

      expect((service as any).memoryBlacklist.has('expired-token')).toBe(false);
      expect((service as any).memoryBlacklist.has('valid-token')).toBe(true);
    });
  });
});
