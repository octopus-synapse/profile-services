import { describe, expect, it } from 'bun:test';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import { CacheIdempotencyAdapter } from './cache-idempotency.adapter';

interface FakeLock {
  released: boolean;
}

function buildFakeCache(): { cache: CachePort; lock: FakeLock } {
  const lock: FakeLock = { released: false };
  const cache = {
    acquireLock: async () => ({
      release: async () => {
        lock.released = true;
      },
    }),
  } as unknown as CachePort;
  return { cache, lock };
}

function nullLogger(): LoggerPort {
  return {
    log: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    verbose: () => {},
  } as unknown as LoggerPort;
}

describe('CacheIdempotencyAdapter.once (P1 #50)', () => {
  it('holds the lock after success by default so the TTL dedups subsequent retries', async () => {
    const { cache, lock } = buildFakeCache();
    const adapter = new CacheIdempotencyAdapter(cache, nullLogger());
    const out = await adapter.once('k', async () => 42);
    expect(out).toBe(42);
    expect(lock.released).toBe(false);
  });

  it('releases the lock after success when releaseOnSuccess=true', async () => {
    const { cache, lock } = buildFakeCache();
    const adapter = new CacheIdempotencyAdapter(cache, nullLogger());
    await adapter.once('k', async () => 1, { releaseOnSuccess: true });
    expect(lock.released).toBe(true);
  });

  it('releases the lock on a transient failure so retry can proceed', async () => {
    const { cache, lock } = buildFakeCache();
    const adapter = new CacheIdempotencyAdapter(cache, nullLogger());
    await expect(
      adapter.once(
        'k',
        async () => {
          throw new Error('network');
        },
        { onError: () => 'transient' },
      ),
    ).rejects.toThrow('network');
    expect(lock.released).toBe(true);
  });

  it('keeps the lock (tombstone) on a permanent failure', async () => {
    const { cache, lock } = buildFakeCache();
    const adapter = new CacheIdempotencyAdapter(cache, nullLogger());
    await expect(
      adapter.once(
        'k',
        async () => {
          throw new Error('bad input');
        },
        { onError: () => 'permanent' },
      ),
    ).rejects.toThrow('bad input');
    expect(lock.released).toBe(false);
  });
});
