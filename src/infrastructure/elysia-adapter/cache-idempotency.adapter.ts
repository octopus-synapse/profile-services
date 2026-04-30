/**
 * `IdempotencyPort`-shaped POJO backed by `CachePort.acquireLock`. The
 * production `IdempotencyService` (Nest + AppLoggerService) was
 * replaced during Phase-2 cutover; this adapter satisfies the same
 * `once(key, fn)` contract using the framework-free CachePort.
 *
 * Semantics: takes a TTL'd lock per `key`; if acquired, runs `fn` and
 * returns its value; if the key is already held, returns `undefined`
 * (the caller treats that as "another instance handled it"). Lock
 * stays for `ttlSeconds` after the call settles so retries within the
 * window are skipped.
 */

import type { CachePort } from '@/shared-kernel/cache/cache.port';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

export interface IdempotencyOnceOptions {
  readonly ttlSeconds?: number;
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
    try {
      return await fn();
    } catch (err) {
      // Lock release is intentional even on failure — best-effort dedup
      // beats a poison-pill key that blocks legitimate retries.
      await lock.release();
      throw err;
    }
  }
}
