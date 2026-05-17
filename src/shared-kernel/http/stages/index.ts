/**
 * Default pipeline stages. Each is a `PipelineStage` — a Koa-style
 * `(ctx, next) => Promise<void>` middleware. Stages are framework-free
 * and live next to the `Route` descriptor so adapters can chain them
 * around route handlers in any order.
 *
 * Phase 1.3 lands the response-wrapping stage (the pure-function
 * counterpart of the existing `ApiResponseInterceptor`). Other stages
 * (`errorMapper`, `requestLogging`, `cors`, `rateLimit`) are added in
 * Phase 2 once their corresponding ports exist (`ErrorMapper`,
 * `LoggerPort` already exists, `CorsPort`, `RateLimitPort`).
 */

import type { HandlerResult } from '../context';
import type { PipelineStage } from '../pipeline';
import { wrapResponse } from './wrap-response';

/**
 * Wraps the handler's return value — placed in `state.responseBody`
 * after `next()` runs. Adapters read `ctx.state.responseBody` to send
 * the final response. Routes that opt out via `Route.skip` get the
 * raw handler output untouched.
 */
export const responseWrapperStage: PipelineStage = {
  name: 'responseWrapper',
  async run(ctx, next) {
    await next();
    const body = ctx.state.responseBody as HandlerResult | undefined;
    ctx.state.responseBody = wrapResponse(body);
  },
};

export {
  type AuthLockoutGuardMetadata,
  type AuthLockoutKeyStrategy,
  type AuthLockoutStageOptions,
  type AuthLockoutStatus,
  authLockoutStage,
  type LoginAttemptsLookup,
} from './auth-lockout.stage';
export { wrapResponse } from './wrap-response';
