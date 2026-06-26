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

import type { FeatureFlagService } from '@/bounded-contexts/platform/feature-flags/application/services/feature-flag.service';
import type { TranslationPort } from '@/bounded-contexts/platform/i18n/domain/translation.port';
import type { OwnershipRegistry } from '@/shared-kernel/authorization';
import type { AuthExtractorPort } from '@/shared-kernel/http/auth-extractor.port';
import type { HttpCtx } from '@/shared-kernel/http/context';
import { mapDomainErrorToHttp } from '@/shared-kernel/http/error.mapper';
import type { NextFn, PipelineStage } from '@/shared-kernel/http/pipeline';
import { mapPrismaErrorToHttp } from '@/shared-kernel/http/prisma-error.mapper';
import type { Route } from '@/shared-kernel/http/route.types';
import {
  authLockoutStage,
  type LoginAttemptsLookup,
  responseWrapperStage,
} from '@/shared-kernel/http/stages';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import { CacheRateLimiter } from './cache-rate-limit.adapter';
import {
  type DomainGateCheck,
  fitProfileGuardStage,
  minQualityGuardStage,
} from './domain-gate-guard.stage';
import { externalApiGuardStage } from './external-api-guard.stage';
import { featureFlagGuardStage } from './feature-flag-guard.stage';
import { internalAuthGuardStage } from './internal-auth-guard.stage';
import { metricsKeyGuardStage } from './metrics-key-guard.stage';
import { multiStepFlowGuardStage } from './multi-step-flow-guard.stage';
import { ownershipGuardStage } from './ownership-guard.stage';
import { type ObserveApiLatency, requestLoggingStage } from './pipeline-stages/logging.stage';
import {
  type AccessModifierLookup,
  permissionGuardStage,
} from './pipeline-stages/permission-guard.stage';

export interface PipelineDeps {
  readonly logger: LoggerPort;
  readonly authExtractor?: AuthExtractorPort;
  readonly i18n?: TranslationPort;
  readonly rateLimiter?: CacheRateLimiter;
  /** P1 #2 / #12 — auth-lockout fast-path (`authLockoutStage`). */
  readonly loginAttempts?: LoginAttemptsLookup;
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
  /** OwnershipRegistry — when provided, routes that declare
   *  `guards: [{ id: 'ownership', metadata: { entity, paramKey } }]`
   *  are gated by an owner-vs-requester comparison BEFORE the handler
   *  runs. Composition root populates the registry per BC. */
  readonly ownershipRegistry?: OwnershipRegistry;
  /** FeatureFlagService — when provided, routes that declare
   *  `guards: [{ id: 'feature-flag', metadata: { key } }]` are gated
   *  by `flags.assertEnabled(key, userId)` before the handler runs. */
  readonly featureFlags?: FeatureFlagService;
  /** Expected `X-Internal-Token` value (read from
   *  `INTERNAL_API_TOKEN` env var). When provided, routes that declare
   *  `guards: [{ id: 'internal-auth' }]` require the header to match. */
  readonly internalApiToken?: string;
  /** Expected Prometheus scrape key (read from `PROMETHEUS_KEY`,
   *  falls back to `INTERNAL_API_TOKEN` in dev). Routes declaring
   *  `guards: [{ id: 'metrics-key' }]` require the bearer token. */
  readonly metricsKey?: string;
  /** Domain check: returns true when the user has a current
   *  (non-expired) Fit Profile. Wired by the bootstrap from the
   *  fit-profile BC's `requireCurrentFitProfile` helper. */
  readonly hasValidFitProfile?: DomainGateCheck;
  /** Domain check: returns true when the user's primary resume meets
   *  the minimum quality score threshold for auto-apply / rage-apply. */
  readonly meetsMinQuality?: DomainGateCheck;
  /**
   * P1-023 — wired by the bootstrap to the metrics BC's
   * `observeApiLatency`. Called from `requestLoggingStage` so the
   * histogram observation reuses the same wall-clock measurement the
   * log line records.
   */
  readonly observeApiLatency?: ObserveApiLatency;
}

/** Build the default ordered stage list. `requestLogging` is outermost
 *  so its `finally` runs after `errorMapper` has settled the response
 *  status — otherwise we'd log 200 for a 500. */
export function buildDefaultPipeline(deps: PipelineDeps): readonly PipelineStage[] {
  const stages: PipelineStage[] = [
    requestLoggingStage({ logger: deps.logger, observeApiLatency: deps.observeApiLatency }),
    errorMapperStage(deps),
  ];
  if (deps.rateLimiter) stages.push(rateLimitStage(deps.rateLimiter));
  // P1 #2 / #12 — auth-lockout sits after rate-limit, before authExtractor.
  if (deps.loginAttempts) stages.push(authLockoutStage({ attempts: deps.loginAttempts }));
  if (deps.authExtractor) stages.push(authExtractorStage(deps.authExtractor));
  if (deps.permissionChecker) {
    stages.push(
      permissionGuardStage(deps.permissionChecker, {
        skipOnboardingGlobally: deps.skipTosCheck === true,
        accessModifierLookup: deps.accessModifierLookup,
      }),
    );
  }
  // OwnershipGuard runs after permission gate so the route's broad
  // permission check (e.g. RESUME_EXPORT) acts first; the ownership
  // gate is the per-instance refinement.
  if (deps.ownershipRegistry) {
    stages.push(ownershipGuardStage(deps.ownershipRegistry));
  }
  // NEW-1: feature-flag stage — runs before handler so a disabled
  // flag returns 404 (matching `FeatureFlagService.assertEnabled`).
  if (deps.featureFlags) {
    stages.push(featureFlagGuardStage(deps.featureFlags));
  }
  // NEW-1 follow-up: internal-auth stage. Always wired so routes
  // that declare the guard fail-closed when INTERNAL_API_TOKEN is
  // unset (vs. silently passing through).
  stages.push(internalAuthGuardStage({ expectedToken: deps.internalApiToken }));
  // NEW-1 follow-up: metrics-key stage — Prometheus scrape token.
  stages.push(metricsKeyGuardStage({ expectedKey: deps.metricsKey }));
  // NEW-1 follow-up: domain gates (fit-profile + min-quality) for
  // auto-apply routes. Both fail-closed when the check function isn't
  // wired (returns 503 instead of silently allowing the route to run).
  stages.push(fitProfileGuardStage(deps.hasValidFitProfile));
  stages.push(minQualityGuardStage(deps.meetsMinQuality));
  // No-op marker stage: the `external-api` guard exists purely so the
  // contract probes can skip routes that hit external services.
  stages.push(externalApiGuardStage());
  // No-op marker stage: `multi-step-flow` flags routes that are middle
  // steps of a multi-request interaction (2FA verify, post-login
  // challenge, password mutation) so contract probes skip them.
  stages.push(multiStepFlowGuardStage());
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
        const prismaMapped = mapPrismaErrorToHttp(err);
        if (prismaMapped) {
          ctx.state.responseStatus = prismaMapped.status;
          ctx.state.responseHeaders = {
            ...((ctx.state.responseHeaders as Record<string, string> | undefined) ?? {}),
            ...prismaMapped.headers,
          };
          ctx.state.responseBody = prismaMapped.body;
          return;
        }
        // Unknown error: surface a 500 with a generic shape.
        deps.logger.error(err instanceof Error ? err.message : String(err), {
          context: 'ElysiaPipeline',
          stack: err instanceof Error ? err.stack : undefined,
        });
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
