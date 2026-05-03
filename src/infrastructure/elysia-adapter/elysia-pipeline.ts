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
import { mapDomainErrorToHttp } from '@/shared-kernel/http/error.mapper';
import type { NextFn, PipelineStage } from '@/shared-kernel/http/pipeline';
import type { Route } from '@/shared-kernel/http/route.types';
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
  /** AccessModifier port — when provided, the permission gate consults
   *  active modifiers per-request to apply DENY suspensions on state /
   *  role and GRANT overrides on permissions. */
  readonly accessModifierLookup?: AccessModifierLookup;
}

/** The slice of IAccessModifierRepository the gate actually needs. */
export interface AccessModifierLookup {
  findActiveForUser(userId: string, at?: Date): Promise<readonly ActiveModifier[]>;
}

export interface ActiveModifier {
  readonly modifierType:
    | 'SUSPEND_EMAIL_VERIFIED'
    | 'SUSPEND_ONBOARDING'
    | 'SUSPEND_ROLE_USER'
    | 'SUSPEND_ROLE_ADMIN'
    | 'GRANT_PERMISSION';
  readonly effect: 'DENY' | 'GRANT';
  readonly permissionId: string | null;
  /** Permission key in `resource:action` form (resolved by the lookup). */
  readonly permissionKey?: string;
}

/** Build the default ordered stage list. `requestLogging` is outermost
 *  so its `finally` runs after `errorMapper` has settled the response
 *  status — otherwise we'd log 200 for a 500. */
export function buildDefaultPipeline(deps: PipelineDeps): readonly PipelineStage[] {
  const stages: PipelineStage[] = [requestLoggingStage(deps.logger), errorMapperStage(deps)];
  if (deps.rateLimiter) stages.push(rateLimitStage(deps.rateLimiter));
  if (deps.authExtractor) stages.push(authExtractorStage(deps.authExtractor));
  if (deps.permissionChecker) {
    stages.push(
      permissionGuardStage(deps.permissionChecker, {
        skipOnboardingGlobally: deps.skipTosCheck === true,
        accessModifierLookup: deps.accessModifierLookup,
      }),
    );
  }
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
          statusCode: 500,
          code: 'INTERNAL',
          message: 'Internal Server Error',
          severity: 'modal',
          params: {},
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
            statusCode: 401,
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            severity: 'modal',
            params: {},
          };
          return;
        }
      } catch (err) {
        if (route.auth.kind === 'optional') return next();
        ctx.state.responseStatus = 401;
        ctx.state.responseBody = {
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: err instanceof Error ? err.message : 'Invalid credentials',
          severity: 'modal',
          params: {},
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
      const guard = route?.guards?.find((g) => g.id === 'rate-limit' || g.id === 'throttle');
      if (!guard) return next();
      // Tests opt out per-request to exercise non-rate-limit paths
      // without burning budget. Bypass is honored only in NODE_ENV=test.
      if (process.env.NODE_ENV === 'test' && ctx.headers['x-e2e-bypass-rate-limit'] === 'true') {
        return next();
      }
      const meta = (guard.metadata ?? {}) as Record<string, unknown>;
      // Accept three shapes: `{ttl, limit}`, `{default: {ttl, limit}}`
      // (Nest throttler), `{points, duration}` (legacy decorator).
      const nested = (meta.default as Record<string, unknown> | undefined) ?? {};
      const rawTtl =
        (typeof meta.ttl === 'number' ? meta.ttl : undefined) ??
        (typeof nested.ttl === 'number' ? nested.ttl : undefined) ??
        (typeof meta.duration === 'number' ? meta.duration : undefined);
      const limit =
        (typeof meta.limit === 'number' ? meta.limit : undefined) ??
        (typeof nested.limit === 'number' ? nested.limit : undefined) ??
        (typeof meta.points === 'number' ? meta.points : undefined) ??
        60;
      // `{default: {ttl: 60000}}` is Nest throttler ms; everything else
      // is seconds. Heuristic: values ≥ 1000 are ms.
      const ttlSeconds =
        rawTtl === undefined ? 60 : rawTtl >= 1000 ? Math.floor(rawTtl / 1000) : rawTtl;
      const ttl = ttlSeconds;
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
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          severity: 'toast',
          params: {},
        };
        return;
      }
      await next();
    },
  };
}

/**
 * Email-verification gate (legacy). Kept as a no-op shim — the unified
 * `permissionGateStage` (below) now performs both state and domain
 * checks in a single pass. This export remains so existing pipeline
 * compositions that name-mention `emailVerifiedGuardStage` keep
 * compiling; remove once every adapter switches to the unified gate.
 */
export function emailVerifiedGuardStage(): PipelineStage {
  return {
    name: 'emailVerifiedGuard',
    async run(_ctx, next) {
      return next();
    },
  };
}

/**
 * Consent / onboarding gate (legacy). Kept as a no-op shim for the
 * same reason as `emailVerifiedGuardStage`.
 */
export function consentGuardStage(_skipGlobally: boolean): PipelineStage {
  return {
    name: 'consentGuard',
    async run(_ctx, next) {
      return next();
    },
  };
}

/**
 * Unified permission gate. Composes:
 *   1) state checks — `User.emailVerified`, `User.hasCompletedOnboarding`
 *      (with the same opt-outs as the legacy gates: `allow-unverified-email`
 *      and `skip-tos-check` markers, plus `/v1/onboarding/*` whitelist);
 *   2) domain check — `route.permission` resolved through the injected
 *      `checker.check(userId, resource, action)` (which itself layers
 *      role-derived permissions with active AccessModifier rows).
 *
 * Outcome: every gate failure surfaces a single 403 carrying
 * `error.code` (back-compat: emits `EMAIL_NOT_VERIFIED` or
 * `ONBOARDING_NOT_COMPLETED` when exactly that single state is
 * missing; otherwise `INSUFFICIENT_PERMISSION`) plus
 * `error.missing: string[]` listing every absent grant. Frontend can
 * read the array to choose redirects/UX without parsing the message.
 *
 * `SKIP_TOS_CHECK=true` (dev compose) globally bypasses the
 * onboarding-completed state check for parity with the legacy
 * `consentGuardStage` behaviour.
 *
 * Public/optional routes pass through (no `ctx.user`).
 */
export function permissionGuardStage(
  checker: { check(userId: string, resource: string, action: string): Promise<boolean> },
  options?: {
    skipOnboardingGlobally?: boolean;
    accessModifierLookup?: AccessModifierLookup;
  },
): PipelineStage {
  const skipOnboardingGlobally = options?.skipOnboardingGlobally === true;
  const lookup = options?.accessModifierLookup;

  return {
    name: 'permissionGuard',
    async run(ctx, next) {
      const route = ctx.state.__route as Route | undefined;
      if (!route || route.auth.kind !== 'jwt') return next();
      if (!ctx.user) return next(); // authExtractor already 401'd if needed

      // Pull active modifiers once per request (when wired). Suspends a
      // state column or role; grants an individual permission outside
      // any role.
      const modifiers = lookup ? await lookup.findActiveForUser(ctx.user.userId) : [];
      const suspendsEmailVerified = modifiers.some(
        (m) => m.modifierType === 'SUSPEND_EMAIL_VERIFIED' && m.effect === 'DENY',
      );
      const suspendsOnboarding = modifiers.some(
        (m) => m.modifierType === 'SUSPEND_ONBOARDING' && m.effect === 'DENY',
      );

      const missing: string[] = [];

      // 1) Email-verified state.
      const allowsUnverified =
        route.guards?.some((g) => g.id === 'allow-unverified-email') === true;
      const effectiveEmailVerified = ctx.user.emailVerified === true && !suspendsEmailVerified;
      if (!allowsUnverified && !effectiveEmailVerified) {
        missing.push('email-verified');
      }

      // 2) Onboarding-completed state.
      // Pre-verify routes (allow-unverified-email) implicitly allow
      // incomplete onboarding — a user who hasn't verified email
      // hasn't entered the onboarding flow yet, so demanding it would
      // be a contradiction.
      const isOnboardingRoute =
        route.path.startsWith('/v1/onboarding/') || route.path === '/v1/onboarding';
      const allowsIncompleteOnboarding =
        skipOnboardingGlobally ||
        isOnboardingRoute ||
        allowsUnverified ||
        route.guards?.some((g) => g.id === 'skip-tos-check') === true;
      const effectiveOnboarding = ctx.user.hasCompletedOnboarding === true && !suspendsOnboarding;
      if (!allowsIncompleteOnboarding && !effectiveOnboarding) {
        missing.push('onboarding-completed');
      }

      // 3) Domain permission.
      if (route.permission) {
        let resource: string;
        let action: string;
        if (typeof route.permission === 'string') {
          const idx = route.permission.indexOf(':');
          if (idx < 0) {
            // malformed — log and let it through rather than hard-fail
            return next();
          }
          resource = route.permission.slice(0, idx);
          action = route.permission.slice(idx + 1);
        } else {
          resource = route.permission.resource;
          action = route.permission.action;
        }
        const permKey = `${resource}:${action}`;
        // GRANT_PERMISSION modifier short-circuits the role check.
        const granted = modifiers.some(
          (m) =>
            m.modifierType === 'GRANT_PERMISSION' &&
            m.effect === 'GRANT' &&
            m.permissionKey === permKey,
        );
        if (!granted) {
          const allowed = await checker.check(ctx.user.userId, resource, action);
          if (!allowed) missing.push(permKey);
        }
      }

      if (missing.length === 0) return next();

      // Back-compat: surface the historical specific code when exactly
      // one state-permission is missing. Otherwise fall back to the
      // generic INSUFFICIENT_PERMISSION envelope; the `missing[]` field
      // always carries the full list either way.
      let code: 'EMAIL_NOT_VERIFIED' | 'ONBOARDING_NOT_COMPLETED' | 'INSUFFICIENT_PERMISSION' =
        'INSUFFICIENT_PERMISSION';
      let message = `Missing: ${missing.join(', ')}`;
      if (missing.length === 1) {
        if (missing[0] === 'email-verified') {
          code = 'EMAIL_NOT_VERIFIED';
          message = 'Email address must be verified to access this resource';
        } else if (missing[0] === 'onboarding-completed') {
          code = 'ONBOARDING_NOT_COMPLETED';
          message = 'Onboarding must be completed before accessing this resource';
        }
      }

      ctx.state.responseStatus = 403;
      ctx.state.responseBody = {
        statusCode: 403,
        code,
        message,
        severity: 'modal',
        params: { missing: missing.join(', ') },
        fields: undefined,
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
