/**
 * Cache Port (Public Resumes context)
 */

export abstract class CachePort {
  abstract get<T>(key: string): Promise<T | null>;
  abstract set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;

  /**
   * Single-flight read: returns the cached value when present, otherwise
   * runs `fn`, caches the result, and returns it. Default implementation
   * lives here so adapters that already provide an optimised single-flight
   * primitive can override; the naive form is good enough for the public
   * read paths (the per-slug stampede is bounded by the share's traffic
   * pattern, not by adversarial concurrency).
   */
  async getOrSet<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
    const value = await fn();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
