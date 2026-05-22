/**
 * Framework-free cache port. Mirrors the surface of the existing
 * `CacheService` (`get/set/delete/deletePattern/flush/acquireLock`)
 * without the `@Injectable()` lifecycle. Adapters back it with Redis
 * today; future impls can drop in an in-memory map for tests.
 */

export interface CacheLock {
  release(): Promise<void>;
}

export abstract class CachePort {
  abstract readonly isEnabled: boolean;

  abstract get<T>(key: string): Promise<T | null>;
  abstract getSecure<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  /**
   * Fail-closed write — semanticamente igual a `set` mas a expectativa
   * é que a implementação throw quando o adapter está desativado /
   * indisponível. Usada por flows críticos (e.g. invalidate-sessions).
   */
  abstract setSecure<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract deletePattern(pattern: string): Promise<void>;
  abstract flush(): Promise<void>;

  abstract acquireLock(key: string, ttlSeconds: number): Promise<CacheLock | null>;

  /**
   * Atomic increment with TTL-on-create — semantics of Redis
   * `INCR key; EXPIRE key ttl NX`. Returns the post-increment value.
   *
   * P0-#15: used by the rate-limit adapter so concurrent requests can't
   * race between read-then-write. The default fallback implementation is a
   * non-atomic get/set composition that subclasses MUST override.
   */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.set(key, next, ttlSeconds);
    return next;
  }

  /** Cache-aside: return cached value or compute via `fn` and store. */
  async getOrSet<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /** Optional: POJO impls expose explicit lifecycle. */
  init?(): Promise<void>;
  dispose?(): Promise<void>;
}
