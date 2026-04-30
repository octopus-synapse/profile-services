/**
 * `RateLimitPort`-style stage backed by `CachePort`. Implements the
 * standard sliding-window check used by `@nestjs/throttler` today,
 * but framework-free: pipeline asks `check(key)` → bumps a counter in
 * Redis (`CachePort`) keyed by IP+route, returns either the remaining
 * budget or a `RateLimited` outcome.
 *
 * The Elysia pipeline stage (see `elysia-pipeline.ts`) consumes this
 * to produce a 429 response when the budget is exhausted. Per-route
 * overrides come through `Route.guards: [{ id: 'rate-limit', metadata: { ttl, limit } }]`.
 */

import type { CachePort } from '@/shared-kernel/cache/cache.port';

export interface RateLimitSpec {
  /** Window length in seconds. */
  readonly ttl: number;
  /** Max requests in the window. */
  readonly limit: number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: number;
}

export class CacheRateLimiter {
  constructor(private readonly cache: CachePort) {}

  async check(key: string, spec: RateLimitSpec): Promise<RateLimitResult> {
    if (!this.cache.isEnabled) {
      return { allowed: true, remaining: spec.limit, resetAt: Date.now() + spec.ttl * 1000 };
    }
    const counterKey = `ratelimit:${key}`;
    const current = (await this.cache.get<number>(counterKey)) ?? 0;
    if (current >= spec.limit) {
      return { allowed: false, remaining: 0, resetAt: Date.now() + spec.ttl * 1000 };
    }
    await this.cache.set(counterKey, current + 1, spec.ttl);
    return {
      allowed: true,
      remaining: spec.limit - current - 1,
      resetAt: Date.now() + spec.ttl * 1000,
    };
  }
}
