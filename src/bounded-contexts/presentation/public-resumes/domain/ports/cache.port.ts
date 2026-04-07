/**
 * Cache Port (Public Resumes context)
 */

export abstract class CachePort {
  abstract get<T>(key: string): Promise<T | null>;
  abstract set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
}
