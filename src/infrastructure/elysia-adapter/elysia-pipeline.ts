/**
 * Pipeline runner for the Elysia adapter. Builds a Koa-style chain of
 * `PipelineStage`s around the route handler. Stages are framework-free
 * (`(ctx, next) => Promise<void>`), so this file is the only place
 * Elysia knows about them.
 *
 * Stage list:
 *   1. requestLogging   — log method/path/status/duration via LoggerPort
 *   2. cors             — handled by @elysiajs/cors plugin at app level
 *   3. rateLimit        — CacheRateLimiter, configured per-route via guards
 *   4. authExtractor    — populates ctx.user via AuthExtractorPort
 *   5. errorMapper      — wraps the chain; converts DomainException → HTTP
 *   6. emailVerifiedGuard — 403 EMAIL_NOT_VERIFIED unless route opts out
 *      via `guards: [{ id: 'allow-unverified-email' }]`
 *   7. consentGuard     — 403 ONBOARDING_NOT_COMPLETED unless route opts
 *      out via `guards: [{ id: 'skip-tos-check' }]` (or env
 *      SKIP_TOS_CHECK=true globally)
 *   8. responseWrapper  — wraps plain values in { success, data }
 *
 * The two gate stages run AFTER `authExtractor` so they have a
 * populated `ctx.user`, and BEFORE `responseWrapper` so the 403 body
 * they emit is the final response.
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
  /** When `true`, `consentGuard` short-circuits to next() — used by the
   *  dev compose where we don't want to enforce TOS on every request. */
  readonly skipTosCheck?: boolean;
  /** Permission checker used by `permissionStage` to gate routes that
   *  declare `permission: Permission.X` or `permission: { resource, action }`. */
  readonly permissionChecker?: {
    check(userId: string, resource: string, action: string): Promise<boolean>;
  };
}

/** Build the default ordered stage list. `requestLogging` is outermost
 *  so its `finally` runs after `errorMapper` has settled the response
 *  status — otherwise we'd log 200 for a 500. */
export function buildDefaultPipeline(deps: PipelineDeps): readonly PipelineStage[] {
  const stages: PipelineStage[] = [requestLoggingStage(deps.logger), errorMapperStage(deps)];
  if (deps.rateLimiter) stages.push(rateLimitStage(deps.rateLimiter));
  if (deps.authExtractor) stages.push(authExtractorStage(deps.authExtractor));
  stages.push(emailVerifiedGuardStage());
  stages.push(consentGuardStage(deps.skipTosCheck === true));
  if (deps.permissionChecker) stages.push(permissionGuardStage(deps.permissionChecker));
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

/**
 * Email-verification gate. Routes with `auth.kind === 'jwt'` reject
 * with 403 EMAIL_NOT_VERIFIED unless:
 *   - the route opts out via `guards: [{ id: 'allow-unverified-email' }]`
 *     (signup, login, refresh, the verification endpoints themselves,
 *     consent acceptance, GDPR export, etc.); or
 *   - the user's `emailVerified` is true (snapshot refreshed at
 *     auth-extractor time).
 *
 * Public/optional routes pass through (no `ctx.user` to gate against).
 */
export function emailVerifiedGuardStage(): PipelineStage {
  return {
    name: 'emailVerifiedGuard',
    async run(ctx, next) {
      const route = ctx.state.__route as Route | undefined;
      if (!route || route.auth.kind !== 'jwt') return next();
      if (route.guards?.some((g) => g.id === 'allow-unverified-email')) return next();
      if (!ctx.user) return next(); // authExtractor already 401'd if missing
      if (ctx.user.emailVerified === true) return next();
      ctx.state.responseStatus = 403;
      ctx.state.responseBody = {
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Email address must be verified to access this resource',
        },
      };
    },
  };
}

/**
 * Onboarding-completion gate. Same shape as the email-verified gate:
 * routes opt out via `guards: [{ id: 'skip-tos-check' }]` (the legacy
 * gate name — covers both consent + onboarding pages); env
 * `SKIP_TOS_CHECK=true` globally bypasses for the dev compose.
 *
 * Hits 403 ONBOARDING_NOT_COMPLETED when the user hasn't finished
 * onboarding. The user's `hasCompletedOnboarding` is hydrated by the
 * auth-extractor from a fresh DB snapshot per request.
 */
export function consentGuardStage(skipGlobally: boolean): PipelineStage {
  return {
    name: 'consentGuard',
    async run(ctx, next) {
      if (skipGlobally) return next();
      const route = ctx.state.__route as Route | undefined;
      if (!route || route.auth.kind !== 'jwt') return next();
      if (route.guards?.some((g) => g.id === 'skip-tos-check')) return next();
      // Onboarding routes are reachable to users who haven't completed
      // onboarding yet — that's the whole point. Admin onboarding routes
      // (/v1/admin/onboarding/*) still require completion.
      if (route.path.startsWith('/v1/onboarding/') || route.path === '/v1/onboarding') {
        return next();
      }
      if (!ctx.user) return next();
      if (ctx.user.hasCompletedOnboarding === true) return next();
      ctx.state.responseStatus = 403;
      ctx.state.responseBody = {
        success: false,
        error: {
          code: 'ONBOARDING_NOT_COMPLETED',
          message: 'Onboarding must be completed before accessing this resource',
        },
      };
    },
  };
}

/**
 * Permission gate. Routes with `permission: Permission.X` (a string
 * like `'resume:create'`) or `permission: { resource, action }` get
 * checked against the user's authorization context. Anything that
 * fails the check resolves to 403 INSUFFICIENT_PERMISSION.
 *
 * `Permission` enum values are dotted resource:action strings; we
 * split on `:` to recover the pair `CheckPermissionUseCase` wants.
 * Object form passes through unchanged.
 *
 * Public/optional routes pass through.
 */
export function permissionGuardStage(checker: {
  check(userId: string, resource: string, action: string): Promise<boolean>;
}): PipelineStage {
  return {
    name: 'permissionGuard',
    async run(ctx, next) {
      const route = ctx.state.__route as Route | undefined;
      if (!route?.permission) return next();
      if (route.auth.kind !== 'jwt') return next();
      if (!ctx.user) return next();

      let resource: string;
      let action: string;
      if (typeof route.permission === 'string') {
        const idx = route.permission.indexOf(':');
        if (idx < 0) return next(); // malformed — let it through rather than hard-fail
        resource = route.permission.slice(0, idx);
        action = route.permission.slice(idx + 1);
      } else {
        resource = route.permission.resource;
        action = route.permission.action;
      }

      const allowed = await checker.check(ctx.user.userId, resource, action);
      if (allowed) return next();
      ctx.state.responseStatus = 403;
      ctx.state.responseBody = {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSION',
          message: `Missing permission: ${resource}:${action}`,
        },
      };
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
