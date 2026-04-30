/**
 * Outbound port for flag-snapshot caching + cross-instance
 * invalidation. The Redis-backed adapter
 * (`infrastructure/cache/redis-flag-cache.service.ts`) implements
 * this; the application layer never sees `ioredis`.
 *
 * Use cases / services depend on this port instead of the concrete
 * Nest service so they stay framework-free.
 */

import type { FeatureFlagKey, FlagEvaluationSnapshot } from '../../domain/types';

export interface FlagCachePort {
  /** Hash a role set into the cache key suffix. */
  fingerprintRoles(roles: readonly string[]): string;
  getSnapshot(fingerprint: string): Promise<FlagEvaluationSnapshot | null>;
  setSnapshot(fingerprint: string, snapshot: FlagEvaluationSnapshot): Promise<void>;
  /** Drop every cached snapshot and broadcast an `invalidate` to peers. */
  invalidateAll(changedKey?: FeatureFlagKey): Promise<void>;
  /** Subscribe to invalidate broadcasts; returns an unsubscribe fn. */
  onInvalidate(fn: () => void): () => void;
}
