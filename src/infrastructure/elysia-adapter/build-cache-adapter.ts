/**
 * Factory that selects the right `CachePort` impl for the runtime
 * environment. Centralises the Redis-vs-in-memory choice so the
 * bootstrap can't accidentally wire `InMemoryCacheAdapter` in
 * production — that's the multi-pod footgun that P1 #10
 * (token-valid-after gate isolated per pod) closed.
 *
 * Rules:
 *   - production / staging  → Redis required. Throw
 *     `ConfigValidationError` if `REDIS_HOST` is unset (fail-fast at
 *     boot instead of silently sharing nothing).
 *   - development / test    → fall back to `InMemoryCacheAdapter`
 *     when Redis is unavailable; use Redis if `REDIS_HOST` is set so
 *     local dev mirrors prod when desired.
 *
 * The factory owns the `RedisConnectionService` instantiation; the
 * caller passes `ConfigPort` + `LoggerPort` and gets back the port
 * implementation.
 *
 * NOTE on placement: the factory lives in `infrastructure/` (next to
 * the adapters) because `shared-kernel/` is forbidden from importing
 * infrastructure adapters (POJO invariant). The port stays in
 * `shared-kernel/cache/` as before.
 */

import { RedisConnectionService } from '@/bounded-contexts/platform/common/cache/redis-connection.service';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import type { ConfigPort } from '@/shared-kernel/config/config.port';
import { ConfigValidationError } from '@/shared-kernel/config/config.schema';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import { InMemoryCacheAdapter } from './in-memory-cache.adapter';
import { RedisCacheAdapter } from './redis-cache.adapter';

export interface BuiltCacheAdapter {
  /** The selected `CachePort` impl. */
  readonly cache: CachePort;
  /**
   * Underlying Redis connection (when wired) so the bootstrap can
   * register it with the lifecycle list / reuse the client for
   * BullMQ. `null` when the in-memory adapter is in use.
   */
  readonly redisConnection: RedisConnectionService | null;
}

export function buildCacheAdapter(config: ConfigPort, logger: LoggerPort): BuiltCacheAdapter {
  const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
  const redisHost = config.get<string>('REDIS_HOST');
  const isProdLike = nodeEnv === 'production' || nodeEnv === 'staging';

  if (isProdLike && !redisHost) {
    throw new ConfigValidationError([
      {
        path: 'REDIS_HOST',
        message:
          `REDIS_HOST is required in ${nodeEnv} — the in-memory cache adapter ` +
          `does not share state between pods (auth invalidation, rate-limit, ` +
          `idempotency would all be per-pod).`,
      },
    ]);
  }

  if (redisHost) {
    const redisConnection = new RedisConnectionService(logger, config);
    if (!redisConnection.client) {
      // RedisConnectionService swallows construction errors and sets
      // `_isEnabled = false` so we never get a usable client. Treat
      // that as a hard boot failure in prod-like envs; in dev fall
      // through to the in-memory adapter.
      if (isProdLike) {
        throw new ConfigValidationError([
          {
            path: 'REDIS_HOST',
            message: `Redis client failed to initialize against host=${redisHost}`,
          },
        ]);
      }
      return { cache: new InMemoryCacheAdapter(), redisConnection: null };
    }
    return {
      cache: new RedisCacheAdapter(redisConnection.client),
      redisConnection,
    };
  }

  return { cache: new InMemoryCacheAdapter(), redisConnection: null };
}
