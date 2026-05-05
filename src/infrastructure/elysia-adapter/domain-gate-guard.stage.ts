/**
 * Domain-gate guards (P1-follow-up to NEW-1) for `fit-profile` and
 * `min-quality` route declarations.
 *
 * Both gates consult a domain-side check via a callback the bootstrap
 * supplies — the pipeline file stays free of cross-BC imports. The
 * callback returns `true` to allow, `false` to block. Misconfiguration
 * (callback unset while route declares the guard) returns 503 instead
 * of silently passing — the route would otherwise run un-guarded.
 *
 * The two stages share enough shape that a single factory builds both.
 *
 * Auto-apply routes typically declare BOTH guards
 * (`guards: [{ id: 'fit-profile' }, { id: 'min-quality' }]`); each
 * stage runs independently and the first failure short-circuits.
 */

import type { PipelineStage } from '@/shared-kernel/http/pipeline';
import type { Route } from '@/shared-kernel/http/route.types';

export type DomainGateCheck = (userId: string) => Promise<boolean>;

interface DomainGateOptions {
  readonly id: 'fit-profile' | 'min-quality';
  readonly check: DomainGateCheck | undefined;
  readonly rejectCode: string;
  readonly rejectMessage: string;
}

function domainGateStage(opts: DomainGateOptions): PipelineStage {
  return {
    name: `${opts.id}Guard`,
    async run(ctx, next) {
      const route = ctx.state.__route as Route | undefined;
      const guard = route?.guards?.find((g) => g.id === opts.id);
      if (!guard) return next();

      if (!opts.check) {
        ctx.state.responseStatus = 503;
        ctx.state.responseBody = {
          statusCode: 503,
          code: `${opts.rejectCode}_NOT_WIRED`,
          message: `${opts.id} guard declared but no check function supplied to the pipeline`,
          severity: 'modal',
          params: {},
        };
        return;
      }
      if (!ctx.user) {
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

      let allowed = false;
      try {
        allowed = await opts.check(ctx.user.userId);
      } catch (err) {
        ctx.state.responseStatus = 503;
        ctx.state.responseBody = {
          statusCode: 503,
          code: `${opts.rejectCode}_CHECK_FAILED`,
          message: err instanceof Error ? err.message : 'gate check failed',
          severity: 'modal',
          params: {},
        };
        return;
      }
      if (!allowed) {
        ctx.state.responseStatus = 403;
        ctx.state.responseBody = {
          statusCode: 403,
          code: opts.rejectCode,
          message: opts.rejectMessage,
          severity: 'modal',
          params: {},
        };
        return;
      }
      await next();
    },
  };
}

export function fitProfileGuardStage(check: DomainGateCheck | undefined): PipelineStage {
  return domainGateStage({
    id: 'fit-profile',
    check,
    rejectCode: 'FIT_PROFILE_REQUIRED',
    rejectMessage: 'A current Fit Profile is required to use this endpoint',
  });
}

export function minQualityGuardStage(check: DomainGateCheck | undefined): PipelineStage {
  return domainGateStage({
    id: 'min-quality',
    check,
    rejectCode: 'RESUME_QUALITY_TOO_LOW',
    rejectMessage: 'Your primary resume does not meet the minimum quality threshold',
  });
}
