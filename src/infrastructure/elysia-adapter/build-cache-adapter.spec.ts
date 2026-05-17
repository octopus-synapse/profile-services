/**
 * `buildCacheAdapter` factory — env-driven selection between
 * Redis-backed and in-memory `CachePort` impls (P1 #10).
 *
 * Production / staging without REDIS_HOST throws
 * `ConfigValidationError` at boot. Dev/test fall back gracefully.
 */

import { describe, expect, it, mock } from 'bun:test';
import type { ConfigPort } from '@/shared-kernel/config/config.port';
import { ConfigValidationError } from '@/shared-kernel/config/config.schema';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import { buildCacheAdapter } from './build-cache-adapter';
import { InMemoryCacheAdapter } from './in-memory-cache.adapter';
import { RedisCacheAdapter } from './redis-cache.adapter';

const buildLogger = (): LoggerPort =>
  ({
    log: mock(),
    debug: mock(),
    warn: mock(),
    error: mock(),
    setContext: mock(),
  }) as unknown as LoggerPort;

const buildConfig = (env: Record<string, string | undefined>): ConfigPort =>
  ({
    get: mock(<T = string>(key: string) => env[key] as T | undefined),
    getOrDefault: mock(<T>(key: string, d: T) => (env[key] as T) ?? d),
  }) as unknown as ConfigPort;

describe('buildCacheAdapter', () => {
  it('returns InMemoryCacheAdapter in dev without REDIS_HOST', () => {
    const { cache, redisConnection } = buildCacheAdapter(
      buildConfig({ NODE_ENV: 'development' }),
      buildLogger(),
    );
    expect(cache).toBeInstanceOf(InMemoryCacheAdapter);
    expect(redisConnection).toBeNull();
  });

  it('returns InMemoryCacheAdapter in test without REDIS_HOST', () => {
    const { cache, redisConnection } = buildCacheAdapter(
      buildConfig({ NODE_ENV: 'test' }),
      buildLogger(),
    );
    expect(cache).toBeInstanceOf(InMemoryCacheAdapter);
    expect(redisConnection).toBeNull();
  });

  it('throws ConfigValidationError in production without REDIS_HOST', () => {
    expect(() => buildCacheAdapter(buildConfig({ NODE_ENV: 'production' }), buildLogger())).toThrow(
      ConfigValidationError,
    );
  });

  it('throws ConfigValidationError in staging without REDIS_HOST', () => {
    expect(() => buildCacheAdapter(buildConfig({ NODE_ENV: 'staging' }), buildLogger())).toThrow(
      ConfigValidationError,
    );
  });

  it('error message references REDIS_HOST so the deploy report is actionable', () => {
    try {
      buildCacheAdapter(buildConfig({ NODE_ENV: 'production' }), buildLogger());
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      expect((err as ConfigValidationError).message).toContain('REDIS_HOST');
    }
  });

  it('returns RedisCacheAdapter when REDIS_HOST is set (prod)', () => {
    // Use a non-routable host so ioredis never establishes a real
    // connection; the constructor still returns a Redis instance, which
    // is all the factory needs to wire RedisCacheAdapter. The deferred
    // connection avoids hanging this unit test on the network.
    const { cache, redisConnection } = buildCacheAdapter(
      buildConfig({ NODE_ENV: 'production', REDIS_HOST: '127.0.0.1', REDIS_PORT: '63999' }),
      buildLogger(),
    );
    expect(cache).toBeInstanceOf(RedisCacheAdapter);
    expect(redisConnection).not.toBeNull();
    // Close the dangling ioredis client so the test runner can exit.
    void redisConnection?.dispose();
  });
});
