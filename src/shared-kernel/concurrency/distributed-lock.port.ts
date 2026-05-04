/**
 * Distributed lock port.
 *
 * Q38 in the duplication audit. Cache.acquireLock + JobQueue dedupe +
 * IdempotencyService all reach for the same Redis-backed locking
 * primitive through different facades. This port is the cross-cutting
 * surface so adapters share one failure mode.
 *
 * Redis-backed adapters (BullMQ, ioredis SETNX) implement this; an
 * in-memory adapter is enough for unit tests.
 */

export interface DistributedLockHandle {
  /** Token returned by the underlying SETNX/SET-with-NX call. */
  readonly token: string;
  /** Releases the lock. Idempotent — calling twice is safe. */
  release(): Promise<void>;
}

export interface AcquireLockOptions {
  /** Lock TTL in milliseconds (the lock auto-releases after this). */
  readonly ttlMs: number;
  /**
   * If set, retry the acquire every `retryEveryMs` ms up to this many
   * times before giving up. Defaults to "no retry" (single attempt).
   */
  readonly maxRetries?: number;
  readonly retryEveryMs?: number;
}

export abstract class DistributedLockPort {
  /**
   * Acquire a lock under `key`. Returns the handle on success or
   * `null` if the key was held by someone else (and retries didn't
   * resolve it).
   */
  abstract acquire(
    key: string,
    options: AcquireLockOptions,
  ): Promise<DistributedLockHandle | null>;

  /**
   * Convenience: acquire → run fn → release. Returns null if the lock
   * couldn't be acquired (caller decides whether to skip or queue).
   */
  async withLock<T>(
    key: string,
    options: AcquireLockOptions,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const handle = await this.acquire(key, options);
    if (!handle) return null;
    try {
      return await fn();
    } finally {
      await handle.release();
    }
  }
}
