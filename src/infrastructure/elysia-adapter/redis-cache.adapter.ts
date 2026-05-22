/**
 * `CachePort` implementation backed by ioredis.
 *
 * P0-#14: the bootstrap previously wired only `InMemoryCacheAdapter`, which
 * meant in a multi-pod deploy the auth `token-valid-after` gate, rate limit,
 * idempotency keys and feed cache were each isolated to a single node — a
 * password reset on pod A did not invalidate sessions served by pod B for
 * up to the JWT TTL.
 *
 * This adapter implements the same `CachePort` shape but talks to a shared
 * Redis instance, so all pods share state. The bootstrap selects it when
 * `REDIS_HOST` is set and falls back to in-memory only in development.
 */

import type Redis from 'ioredis';
import { type CacheLock, CachePort } from '@/shared-kernel/cache/cache.port';

export class RedisCacheAdapter extends CachePort {
  readonly isEnabled = true;

  constructor(private readonly client: Redis) {
    super();
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) return null;
    // Bound parse cost on entries that somehow grew unexpectedly large.
    if (raw.length > 5_000_000) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async getSecure<T>(key: string): Promise<T | null> {
    return this.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds = 0): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, payload);
    }
  }

  /**
   * Fail-closed write — usado por flows críticos (e.g.
   * `SessionInvalidationAdapter` no token-valid-after gate). A
   * implementação Redis simplesmente chama `set`: o cliente é
   * exigido no construtor e qualquer falha de I/O propaga.
   */
  async setSecure<T>(key: string, value: T, ttlSeconds = 0): Promise<void> {
    return this.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.client.unlink(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!pattern || pattern.length < 3) return;
    // SCAN + UNLINK in chunks — never `KEYS *` (blocks Redis on large keyspaces).
    const stream = this.client.scanStream({ match: pattern, count: 200 });
    let pending: Promise<unknown>[] = [];
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length === 0) continue;
      pending.push(this.client.unlink(...keys));
      if (pending.length >= 10) {
        await Promise.all(pending);
        pending = [];
      }
    }
    if (pending.length > 0) await Promise.all(pending);
  }

  async flush(): Promise<void> {
    await this.client.flushdb();
  }

  async acquireLock(key: string, ttlSeconds: number): Promise<CacheLock | null> {
    // SET NX EX → atomic single-instance lock. Multi-master Redis (Sentinel /
    // Cluster) would warrant Redlock, but the production deploy is single-master.
    const lockKey = `lock:${key}`;
    const ok = await this.client.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
    if (ok !== 'OK') return null;
    return {
      release: async () => {
        await this.client.unlink(lockKey);
      },
    };
  }

  /**
   * Atomic INCR + EXPIRE-NX. Closes the read/check/write race the
   * non-atomic CachePort default left open in multi-pod deploys.
   */
  override async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const pipeline = this.client.multi();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds, 'NX');
    const result = await pipeline.exec();
    // result is [[err, value], [err, value]]
    const incrResult = result?.[0];
    if (!incrResult) return 0;
    const [, value] = incrResult;
    return typeof value === 'number' ? value : Number(value);
  }
}
