import { Injectable } from '@nestjs/common';
import { CacheLockService } from '../cache/cache-lock.service';
import { AppLoggerService } from '../logger/logger.service';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24h

@Injectable()
export class IdempotencyService {
  constructor(
    private readonly cacheLock: CacheLockService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Run `fn` at most once per `key` within the TTL window.
   * If another instance has already acquired the key, the call is skipped silently.
   *
   * Use for event handlers that must not duplicate side-effects when an
   * event is dispatched more than once (retries, network duplication, etc.).
   *
   * Note: this is best-effort. If the work fails after the key is set,
   * the key still blocks retries until the TTL expires. Pick a TTL that
   * matches your retry/dedup window.
   */
  async once<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds = DEFAULT_TTL_SECONDS,
  ): Promise<T | null> {
    const acquired = await this.cacheLock.acquireLock(key, ttlSeconds, { allowWithoutLock: true });
    if (!acquired) {
      this.logger.debug(
        `Idempotent handler skipped (already processed): ${key}`,
        'IdempotencyService',
      );
      return null;
    }
    return fn();
  }
}
