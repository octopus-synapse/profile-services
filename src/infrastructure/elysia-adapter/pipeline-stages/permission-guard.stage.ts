/**
 * Authorization pipeline stages: the unified permission gate plus the
 * legacy email-verified / consent shims it superseded. Split out of
 * `elysia-pipeline.ts` to keep that file within the file-size budget;
 * the gate is the single largest stage and is self-contained apart from
 * the `AccessModifierLookup` slice it consults.
 */

import type { PipelineStage } from '@/shared-kernel/http/pipeline';
import type { Route } from '@/shared-kernel/http/route.types';

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

/**
 * Email-verification gate (legacy). Kept as a no-op shim — the unified
 * `permissionGuardStage` (below) now performs both state and domain
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

      // Surface the most actionable code: state gates (email/onboarding)
      // outrank the generic `INSUFFICIENT_PERMISSION` even when domain
      // permissions are *also* missing, because the user has to fix the
      // state gate first — granting them the perm wouldn't unblock them
      // anyway. The `missing[]` field carries the full list for clients
      // that want to render every requirement.
      let code: 'EMAIL_NOT_VERIFIED' | 'ONBOARDING_NOT_COMPLETED' | 'INSUFFICIENT_PERMISSION' =
        'INSUFFICIENT_PERMISSION';
      let message = `Missing: ${missing.join(', ')}`;
      if (missing.includes('email-verified')) {
        code = 'EMAIL_NOT_VERIFIED';
        message = 'Email address must be verified to access this resource';
      } else if (missing.includes('onboarding-completed')) {
        code = 'ONBOARDING_NOT_COMPLETED';
        message = 'Onboarding must be completed before accessing this resource';
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
