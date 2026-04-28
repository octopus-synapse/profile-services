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
  abstract delete(key: string): Promise<void>;
  abstract deletePattern(pattern: string): Promise<void>;
  abstract flush(): Promise<void>;

  abstract acquireLock(key: string, ttlSeconds: number): Promise<CacheLock | null>;

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
