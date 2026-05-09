/**
 * Cache invalidation port.
 *
 * Q32 in the duplication audit. Centralises cache invalidation so
 * handlers depend on this port instead of calling `cache.delete()` /
 * `cache.deletePattern()` directly. The contract carries entity-typed
 * intent ("invalidate this resume", "invalidate this user") so the
 * cascade rules (which keys/patterns to drop, related caches to bust)
 * live in one place.
 *
 * The Q75 transition strategy: a lint rule starts as a warning,
 * forbidding `cache.delete*` calls outside the `CacheInvalidationService`
 * implementation. Once existing callers migrate to this port the
 * warning becomes an error.
 */

export interface InvalidateResumeInput {
  readonly resumeId: string;
  readonly slug?: string;
  readonly userId: string;
}

export abstract class CacheInvalidationPort {
  /** Drop every cache entry derived from this resume. */
  abstract invalidateResume(input: InvalidateResumeInput): Promise<void>;

  /** Drop every cache entry scoped to this user (profile, sessions, etc). */
  abstract invalidateUser(userId: string): Promise<void>;

  /**
   * Drop every cache entry under a tenant prefix. Use when a multi-
   * key concept changes (e.g. "all jobs in this company").
   */
  abstract invalidatePrefix(prefix: string): Promise<void>;
}
