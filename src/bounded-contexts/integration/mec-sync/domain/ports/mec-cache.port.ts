/**
 * Outbound port for the cross-cutting cache that the MEC BC uses for:
 *   - the sync lock (one run at a time)
 *   - the metadata snapshot (last sync status / counts)
 *   - the read-side caches for institutions / courses / search results
 *
 * Adapter is a thin wrapper around `CacheService` from platform/.
 */

export abstract class MecCachePort {
  abstract get<T>(key: string): Promise<T | null>;
  abstract set(key: string, value: unknown, ttl?: number): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract deletePattern(pattern: string): Promise<void>;
  abstract acquireLock(key: string, ttl: number): Promise<boolean>;
  abstract releaseLock(key: string): Promise<void>;
  abstract isLocked(key: string): Promise<boolean>;
}
