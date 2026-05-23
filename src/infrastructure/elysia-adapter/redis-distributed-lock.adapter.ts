/**
 * Redis-backed `DistributedLockPort` (SETNX-style).
 *
 * Uses `SET key token NX EX ttl` for atomic acquire and a tiny Lua
 * script for release so the lock is only freed by the holder that
 * owns the current token (defends against the classic "TTL expires,
 * another acquirer takes the lock, original releases the new lock"
 * race).
 *
 * Falls back to a no-lock posture when Redis is disabled — `acquire`
 * returns a synthetic handle so single-instance dev environments keep
 * working without a Redis dependency. Production deploys MUST set
 * `REDIS_HOST`; the in-process fallback isn't safe across pods (the
 * whole point of the port).
 */

import { randomUUID } from 'node:crypto';
import type { RedisConnectionService } from '@/bounded-contexts/platform/common/cache/redis-connection.service';
import {
  type AcquireLockOptions,
  type DistributedLockHandle,
  DistributedLockPort,
} from '@/shared-kernel/concurrency/distributed-lock.port';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Lua: only DEL the key if its value matches the token we hold.
// Returns 1 on success, 0 if someone else now owns the lock.
const RELEASE_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  else
    return 0
  end
`;

export class RedisDistributedLockAdapter extends DistributedLockPort {
  constructor(
    private readonly redis: RedisConnectionService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async acquire(key: string, options: AcquireLockOptions): Promise<DistributedLockHandle | null> {
    if (!this.redis.isEnabled || !this.redis.client) {
      // P2-#27: in production a missing Redis is a configuration
      // emergency — every cron / single-flight path would run on
      // every pod simultaneously (multiplying notification emails,
      // metrics writes, OpenAI spend, etc.). Fail closed with a
      // null lock so guarded jobs skip instead of fanning out.
      if (IS_PRODUCTION) {
        this.logger.error(
          `Distributed lock requested for ${key} but Redis is disabled in production — refusing to issue a no-op lock`,
          { context: 'RedisDistributedLockAdapter' },
        );
        return null;
      }
      // Single-instance dev only. We surface a warn the first time
      // so it's not invisible.
      this.logger.warn(
        `Distributed lock for ${key} is running without Redis (dev-only no-op handle)`,
        'RedisDistributedLockAdapter',
      );
      return {
        token: 'dev-no-redis',
        release: async () => {
          /* no-op */
        },
      };
    }

    const client = this.redis.client;
    const maxRetries = options.maxRetries ?? 0;
    const retryEveryMs = options.retryEveryMs ?? 50;
    let attempts = 0;

    while (true) {
      const token = randomUUID();
      try {
        // ioredis types: SET supports NX + PX/EX as variadic args.
        const result = await client.set(key, token, 'PX', options.ttlMs, 'NX');
        if (result === 'OK') {
          return {
            token,
            release: async () => {
              try {
                await client.eval(RELEASE_SCRIPT, 1, key, token);
              } catch (err) {
                this.logger.warn(
                  `Distributed lock release failed for ${key}: ${(err as Error).message}`,
                  'RedisDistributedLockAdapter',
                );
              }
            },
          };
        }
      } catch (err) {
        // Connection error — fail closed (return null so callers either
        // skip or retry deliberately, instead of running unguarded).
        this.logger.warn(
          `Distributed lock acquire failed for ${key}: ${(err as Error).message}`,
          'RedisDistributedLockAdapter',
        );
        return null;
      }

      if (attempts >= maxRetries) return null;
      attempts += 1;
      await new Promise((r) => setTimeout(r, retryEveryMs));
    }
  }
}
