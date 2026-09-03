import { describe, expect, it, mock } from 'bun:test';
import { translationRoutes } from '@/bounded-contexts/translation/translation.routes';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { Route } from '@/shared-kernel/http/route.types';
import type { CacheRateLimiter, RateLimitSpec } from './cache-rate-limit.adapter';
import { rateLimitStage } from './elysia-pipeline';

function makeLimiter() {
  const check = mock(async (_key: string, _spec: RateLimitSpec) => ({
    allowed: true,
    remaining: 1,
    resetAt: 0,
  }));
  return { limiter: { check } as unknown as CacheRateLimiter, check };
}

function makeCtx(route: Route): HttpCtx {
  return {
    method: route.method,
    path: route.path,
    headers: {},
    cookies: {},
    ip: '10.0.0.1',
    userAgent: undefined,
    body: undefined,
    query: {},
    params: {},
    user: { userId: 'user-1' } as HttpCtx['user'],
    state: { __route: route },
  };
}

describe('rateLimitStage — window unit', () => {
  it('enforces the translation LLM routes at 30 requests per 3600 s, not 3 s', async () => {
    const route = translationRoutes.find((r) => r.path === '/v1/translation/detect') as Route;
    expect(route.guards?.some((g) => g.id === 'rate-limit')).toBe(true);

    const { limiter, check } = makeLimiter();
    await rateLimitStage(limiter, 'userId').run(makeCtx(route), async () => {});

    expect(check).toHaveBeenCalledTimes(1);
    expect(check.mock.calls[0]?.[1]).toEqual({ ttl: 3600, limit: 30 });
  });

  it('reads durationSeconds verbatim — a large value is still seconds', async () => {
    const route: Route = {
      method: 'POST',
      path: '/v1/example',
      auth: { kind: 'public' },
      guards: [
        { id: 'rate-limit', metadata: { points: 5, durationSeconds: 86_400, keyStrategy: 'ip' } },
      ],
      openapi: { summary: 'x', tags: [] },
      handler: async () => null,
    } as unknown as Route;

    const { limiter, check } = makeLimiter();
    await rateLimitStage(limiter, 'ip').run(makeCtx(route), async () => {});

    expect(check.mock.calls[0]?.[1]).toEqual({ ttl: 86_400, limit: 5 });
  });

  it('rejects a guard that still uses the old duration / ttl spellings', async () => {
    const route: Route = {
      method: 'POST',
      path: '/v1/legacy',
      auth: { kind: 'public' },
      guards: [{ id: 'rate-limit', metadata: { points: 5, duration: 3600, keyStrategy: 'ip' } }],
      openapi: { summary: 'x', tags: [] },
      handler: async () => null,
    } as unknown as Route;

    const { limiter } = makeLimiter();
    await expect(rateLimitStage(limiter, 'ip').run(makeCtx(route), async () => {})).rejects.toThrow(
      /durationSeconds/,
    );
  });
});
