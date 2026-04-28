/**
 * Pipeline runner for the Elysia adapter. Builds a Koa-style chain of
 * `PipelineStage`s around the route handler. Stages are framework-free
 * (`(ctx, next) => Promise<void>`), so this file is the only place
 * Elysia knows about them.
 *
 * Stage list — same 9 the plan calls out:
 *   1. requestLogging   — log method/path/status/duration via LoggerPort
 *   2. cors             — handled by @elysiajs/cors plugin at app level
 *   3. rateLimit        — CacheRateLimiter, configured per-route via guards
 *   4. authExtractor    — populates ctx.user via AuthExtractorPort
 *   5. errorMapper      — wraps the chain; converts DomainException → HTTP
 *   6. responseWrapper  — wraps plain values in { success, data }
 *   7. humanRelativeDates — placeholder (no-op until i18n wiring lands)
 *   8. consentGuard     — placeholder (no-op until consent wiring lands)
 *   9. emailVerifiedGuard — placeholder (no-op until verified wiring lands)
 *
 * Stages 7-9 are intentionally no-ops here; their full implementations
 * will land in Phase 1 alongside the BCs that need them. The shape is
 * already in place so adding them later is a one-line registration.
 */

import type { TranslationPort } from '@/bounded-contexts/platform/i18n/domain/translation.port';
import type { AuthExtractorPort } from '@/shared-kernel/http/auth-extractor.port';
import type { HttpCtx } from '@/shared-kernel/http/context';
import { mapDomainErrorToHttp } from '@/shared-kernel/http/error-mapper';
import type { NextFn, PipelineStage } from '@/shared-kernel/http/pipeline';
import type { Route } from '@/shared-kernel/http/route';
import { responseWrapperStage } from '@/shared-kernel/http/stages';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import { CacheRateLimiter } from './cache-rate-limit.adapter';

export interface PipelineDeps {
  readonly logger: LoggerPort;
  readonly authExtractor?: AuthExtractorPort;
  readonly i18n?: TranslationPort;
  readonly rateLimiter?: CacheRateLimiter;
}

/** Build the default ordered stage list. `requestLogging` is outermost
 *  so its `finally` runs after `errorMapper` has settled the response
 *  status — otherwise we'd log 200 for a 500. */
export function buildDefaultPipeline(deps: PipelineDeps): readonly PipelineStage[] {
  const stages: PipelineStage[] = [requestLoggingStage(deps.logger), errorMapperStage(deps)];
  if (deps.rateLimiter) stages.push(rateLimitStage(deps.rateLimiter));
  if (deps.authExtractor) stages.push(authExtractorStage(deps.authExtractor));
  stages.push(responseWrapperStage);
  return stages;
}

export function errorMapperStage(deps: PipelineDeps): PipelineStage {
  return {
    name: 'errorMapper',
    async run(ctx, next) {
      try {
        await next();
      } catch (err) {
        if (deps.i18n) {
          const mapped = mapDomainErrorToHttp(err, deps.i18n, ctx.headers['accept-language']);
          if (mapped) {
            ctx.state.responseStatus = mapped.status;
            ctx.state.responseHeaders = {
              ...((ctx.state.responseHeaders as Record<string, string> | undefined) ?? {}),
              ...mapped.headers,
            };
            ctx.state.responseBody = mapped.body;
            return;
          }
        }
        // Unknown error: surface a 500 with a generic shape.
        deps.logger.error(
          err instanceof Error ? err.message : String(err),
          err instanceof Error ? err.stack : undefined,
          'ElysiaPipeline',
        );
        ctx.state.responseStatus = 500;
        ctx.state.responseBody = {
          success: false,
          error: { code: 'INTERNAL', message: 'Internal Server Error' },
        };
      }
    },
  };
}

export function requestLoggingStage(logger: LoggerPort): PipelineStage {
  return {
    name: 'requestLogging',
    async run(ctx, next) {
      const start = Date.now();
      try {
        await next();
      } finally {
        const duration = Date.now() - start;
        const status = (ctx.state.responseStatus as number | undefined) ?? 200;
        logger.log(`${ctx.method} ${ctx.path} ${status} ${duration}ms`, 'ElysiaPipeline', {
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
      }
    },
  };
}

export function authExtractorStage(extractor: AuthExtractorPort): PipelineStage {
  return {
    name: 'authExtractor',
    async run(ctx, next) {
      const route = ctx.state.__route as Route | undefined;
      if (!route || route.auth.kind === 'public') return next();
      try {
        const user = await extractor.extract({
          headers: ctx.headers,
          cookies: ctx.cookies,
        });
        ctx.user = user;
        if (route.auth.kind === 'jwt' && !user) {
          ctx.state.responseStatus = 401;
          ctx.state.responseBody = {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          };
          return;
        }
      } catch (err) {
        if (route.auth.kind === 'optional') return next();
        ctx.state.responseStatus = 401;
        ctx.state.responseBody = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: err instanceof Error ? err.message : 'Invalid credentials',
          },
        };
        return;
      }
      await next();
    },
  };
}

export function rateLimitStage(limiter: CacheRateLimiter): PipelineStage {
  return {
    name: 'rateLimit',
    async run(ctx, next) {
      const route = ctx.state.__route as Route | undefined;
      const guard = route?.guards?.find((g) => g.id === 'rate-limit');
      if (!guard) return next();
      const meta = guard.metadata ?? {};
      const ttl = typeof meta.ttl === 'number' ? meta.ttl : 60;
      const limit = typeof meta.limit === 'number' ? meta.limit : 60;
      const key = `${ctx.ip ?? 'anon'}:${route?.method}:${route?.path}`;
      const result = await limiter.check(key, { ttl, limit });
      ctx.state.responseHeaders = {
        ...((ctx.state.responseHeaders as Record<string, string> | undefined) ?? {}),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(result.remaining),
      };
      if (!result.allowed) {
        ctx.state.responseStatus = 429;
        ctx.state.responseBody = {
          success: false,
          error: { code: 'RATE_LIMITED', message: 'Too many requests' },
        };
        return;
      }
      await next();
    },
  };
}

/** Run a chain of stages around `terminal`. Stages opt out via
 *  `route.skip: ['stageName']` on the route descriptor. */
export async function runPipeline(
  ctx: HttpCtx,
  route: Route,
  stages: readonly PipelineStage[],
  terminal: () => Promise<void>,
): Promise<void> {
  ctx.state.__route = route;
  const skip = new Set(route.skip ?? []);
  const chain = stages.filter((s) => !skip.has(s.name));
  let i = -1;
  const dispatch = async (idx: number): Promise<void> => {
    if (idx <= i) throw new Error('next() called multiple times');
    i = idx;
    if (idx === chain.length) {
      await terminal();
      return;
    }
    const stage = chain[idx];
    if (!stage) return;
    const next: NextFn = () => dispatch(idx + 1);
    await stage.run(ctx, next);
  };
  await dispatch(0);
}
