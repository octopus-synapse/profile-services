/**
 * `IdempotencyPort`-shaped POJO backed by `CachePort.acquireLock`. The
 * production `IdempotencyService` (Nest + AppLoggerService) was
 * replaced during Phase-2 cutover; this adapter satisfies the same
 * `once(key, fn)` contract using the framework-free CachePort.
 *
 * Default semantics:
 *
 *   - **success**: the lock is *kept* for `ttlSeconds` so retries
 *     inside the TTL window are silently skipped. This is the
 *     event-handler pattern — welcome activity, mutual-follow,
 *     resume-created analytics — where executing the side effect
 *     twice would be visible to the user.
 *   - **transient failure** (network, timeout, downstream 5xx): the
 *     lock is released so a retry can pick the work up immediately.
 *     `onError` returns `'transient'` (also the default if unset, to
 *     preserve historical behaviour).
 *   - **permanent failure** (bad input, downstream 4xx surface): the
 *     lock is left in place ("tombstoned") so a retry burst doesn't
 *     keep paying the same broken work. Caller opts in via
 *     `onError: () => 'permanent'`.
 *
 * P1 #50 — the previous implementation released the lock *only* on
 * failure. Permanent failures (bad input) released the lock and let
 * the next retry pay the same broken work, then released again — an
 * unbounded poison-pill loop. `releaseOnSuccess` is the explicit
 * opt-in for callers that want the historical "lock just spans the
 * current run" behaviour (poll workers, refresh sweeps).
 */

import type { CachePort } from '@/shared-kernel/cache/cache.port';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

export type IdempotencyFailureKind = 'transient' | 'permanent';

export interface IdempotencyOnceOptions {
  readonly ttlSeconds?: number;
  /**
   * Classify a failure so the adapter knows whether to release the
   * lock (transient, retry should proceed) or keep it (permanent,
   * tombstone the work until TTL expires). Defaults to `'transient'`
   * — that mirrors the historical "always release on error" behaviour
   * so unaware callers don't regress into permanent tombstones.
   */
  readonly onError?: (err: unknown) => IdempotencyFailureKind;
  /**
   * Release the lock immediately after a successful run instead of
   * leaving it in place for the full TTL. Defaults to `false` so
   * existing event-handler callers (welcome activity, mutual follow,
   * resume-created analytics, …) keep their existing dedup window —
   * retries inside the TTL must not double-create the side effect.
   *
   * Set to `true` for naturally periodic jobs (poll workers, refresh
   * sweeps) where the lock is only meant to span the current run.
   */
  readonly releaseOnSuccess?: boolean;
}

export class CacheIdempotencyAdapter {
  constructor(
    private readonly cache: CachePort,
    private readonly logger: LoggerPort,
  ) {}

  async once<T>(
    key: string,
    fn: () => Promise<T>,
    options: IdempotencyOnceOptions = {},
  ): Promise<T | undefined> {
    const ttl = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const lock = await this.cache.acquireLock(`idem:${key}`, ttl);
    if (!lock) {
      this.logger.debug(`Idempotency skip: ${key}`, 'CacheIdempotencyAdapter');
      return undefined;
    }
    const classify = options.onError ?? (() => 'transient' as IdempotencyFailureKind);
    try {
      const result = await fn();
      if (options.releaseOnSuccess) await lock.release();
      return result;
    } catch (err) {
      const kind = classify(err);
      if (kind === 'transient') {
        // Best-effort dedup beats a poison-pill key that blocks
        // legitimate retries from a transient failure.
        await lock.release();
      } else {
        this.logger.warn(
          `Idempotency tombstone (permanent): ${key} held for ${ttl}s`,
          'CacheIdempotencyAdapter',
          { error: err instanceof Error ? err.message : String(err) },
        );
      }
      throw err;
    }
  }
}
