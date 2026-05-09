/**
 * Internal-auth pipeline stage (P1-follow-up to NEW-1).
 *
 * Routes that should only be reachable from trusted internal callers
 * (cron tooling, GitHub Actions, ops scripts) declare:
 *
 *   guards: [{ id: 'internal-auth' }]
 *
 * The stage compares an `X-Internal-Token` header against the
 * `INTERNAL_API_TOKEN` env var. Mismatches return 401 immediately,
 * before the handler runs. The token is intentionally a constant-time
 * comparison so a leaked log line can't reveal length-leak signal.
 *
 * If `INTERNAL_API_TOKEN` is not set at boot, every internal-auth
 * route is rejected — fail-closed. The bootstrap logs a warning so
 * operators notice the misconfiguration.
 */

import { timingSafeEqual } from 'node:crypto';
import type { PipelineStage } from '@/shared-kernel/http/pipeline';
import type { Route } from '@/shared-kernel/http/route.types';

export interface InternalAuthGuardOptions {
  /** Expected token (read from `INTERNAL_API_TOKEN` env var by the
   *  composition root). Empty / undefined → all internal-auth routes
   *  fail closed. */
  readonly expectedToken: string | undefined;
}

function safeEqualString(a: string, b: string): boolean {
  // Length mismatch → still run a constant-time compare against a
  // padded buffer so timing doesn't leak the expected length.
  const target = Buffer.from(a);
  const supplied = Buffer.from(b);
  if (target.length !== supplied.length) {
    // Run a dummy compare against a same-length buffer to avoid
    // leaking length via early return.
    timingSafeEqual(target, Buffer.alloc(target.length));
    return false;
  }
  return timingSafeEqual(target, supplied);
}

export function internalAuthGuardStage(opts: InternalAuthGuardOptions): PipelineStage {
  const expected = opts.expectedToken ?? '';
  return {
    name: 'internalAuthGuard',
    async run(ctx, next) {
      const route = ctx.state.__route as Route | undefined;
      const guard = route?.guards?.find((g) => g.id === 'internal-auth');
      if (!guard) return next();

      if (!expected) {
        ctx.state.responseStatus = 401;
        ctx.state.responseBody = {
          statusCode: 401,
          code: 'INTERNAL_AUTH_DISABLED',
          message: 'Internal endpoints disabled (INTERNAL_API_TOKEN not configured)',
          severity: 'modal',
          params: {},
        };
        return;
      }

      const supplied = ctx.headers['x-internal-token'];
      const ok = typeof supplied === 'string' && safeEqualString(expected, supplied);
      if (!ok) {
        ctx.state.responseStatus = 401;
        ctx.state.responseBody = {
          statusCode: 401,
          code: 'INTERNAL_AUTH_REJECTED',
          message: 'Invalid internal API token',
          severity: 'modal',
          params: {},
        };
        return;
      }
      await next();
    },
  };
}
