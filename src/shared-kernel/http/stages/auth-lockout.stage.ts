/**
 * Auth-lockout pipeline stage — fast-path 423 before the route handler
 * even loads.
 *
 * Background. The login use case already calls
 * `LoginAttemptsPort.getLockStatus(email)` and throws
 * `AccountLockedException` when the email is locked, but that path
 * requires going through:
 *   - HTTP body parse (zod)
 *   - authExtractor stage
 *   - rateLimit stage
 *   - permissionGuard stage
 *   - handler invocation → use-case execution → repo lookup → throw
 *
 * That's ~5 round trips through DI + Postgres on every locked attempt.
 * P1 #2 / #12 require login + login-2fa to short-circuit at the
 * pipeline so an attacker spraying 50req/s against a locked account
 * never reaches the auth code path.
 *
 * The stage is opt-in per-route via
 * `guards: [{ id: 'auth-lockout', metadata: { keyStrategy } }]`.
 * `keyStrategy: 'email'` reads `ctx.body.email`; `keyStrategy: 'ip'`
 * reads `ctx.ip`. When the body shape doesn't carry the expected key
 * the stage is a no-op (fail-open) — that's the correct default
 * because: (a) the route's body schema would have already 400'd if the
 * field were truly required, (b) the use-case-level check still runs
 * for any code path the pipeline didn't preempt.
 *
 * The lockout port is intentionally a tiny structural interface
 * (`LoginAttemptsLookup`) so the stage doesn't reach into the
 * authentication BC for a class. The bootstrap adapts the real
 * `LoginAttemptsPort` instance to this shape at composition time.
 */

import type { HttpCtx } from '../context';
import type { PipelineStage } from '../pipeline';
import type { GuardSpec, Route } from '../route.types';

export type AuthLockoutKeyStrategy = 'email' | 'ip';

export interface AuthLockoutGuardMetadata {
  readonly keyStrategy: AuthLockoutKeyStrategy;
}

/** Read-side projection of `LoginAttemptsPort.getLockStatus` — the
 *  stage only needs to know if the key is locked and how long until it
 *  unlocks. Keeps shared-kernel free of an `auth/`-BC dependency. */
export interface AuthLockoutStatus {
  readonly locked: boolean;
  readonly resetInSeconds: number | null;
}

export interface LoginAttemptsLookup {
  getLockStatus(key: string): Promise<AuthLockoutStatus>;
}

function resolveGuard(route: Route | undefined): GuardSpec | undefined {
  return route?.guards?.find((g) => g.id === 'auth-lockout');
}

function extractKey(ctx: HttpCtx, strategy: AuthLockoutKeyStrategy): string | undefined {
  if (strategy === 'ip') {
    return ctx.ip ?? undefined;
  }
  // 'email' — body is already parsed by route mounter when this stage
  // runs; if the body either isn't an object or doesn't carry `email`
  // we no-op (the use-case check is still the source of truth).
  const body = ctx.body as { email?: unknown } | undefined;
  const candidate = body?.email;
  if (typeof candidate !== 'string') return undefined;
  // Normalise case so an attacker can't bypass by toggling Mixed.Case@
  // — the rest of the system already lowercases on signup/lookup.
  return candidate.trim().toLowerCase();
}

export interface AuthLockoutStageOptions {
  readonly attempts: LoginAttemptsLookup;
}

export function authLockoutStage(options: AuthLockoutStageOptions): PipelineStage {
  return {
    name: 'authLockout',
    async run(ctx, next) {
      const route = ctx.state.__route as Route | undefined;
      const guard = resolveGuard(route);
      if (!guard) return next();

      const metadata = (guard.metadata ?? {}) as Partial<AuthLockoutGuardMetadata>;
      const strategy: AuthLockoutKeyStrategy = metadata.keyStrategy === 'ip' ? 'ip' : 'email';
      const key = extractKey(ctx, strategy);
      if (!key) return next();

      const status = await options.attempts.getLockStatus(key);
      if (!status.locked) return next();

      const retryAfter = Math.max(1, status.resetInSeconds ?? 60);
      ctx.state.responseStatus = 423;
      ctx.state.responseHeaders = {
        ...((ctx.state.responseHeaders as Record<string, string> | undefined) ?? {}),
        'Retry-After': String(retryAfter),
      };
      ctx.state.responseBody = {
        statusCode: 423,
        code: 'ACCOUNT_LOCKED',
        message: 'Account is temporarily locked due to too many failed attempts',
        severity: 'modal',
        params: { retryAfter },
      };
    },
  };
}
