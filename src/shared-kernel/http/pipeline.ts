/**
 * Pipeline stage contract. Each stage is `(ctx, next) => Promise<void>`
 * — Koa-style middleware. Stages are framework-free; adapters (Nest
 * today, Elysia tomorrow) execute them in order around the route
 * handler.
 *
 * Concrete stage implementations live next to their port (e.g.
 * `errorMapper` lives next to `ErrorMapper` once Phase 2.6 lands). The
 * default pipeline composition is exported here so `bootstrap()` can
 * pass it to the adapter as a single array.
 */

import type { HttpCtx } from './context';

export type NextFn = () => Promise<void>;

export type PipelineStage = {
  readonly name: string;
  readonly run: (ctx: HttpCtx, next: NextFn) => Promise<void>;
};

/**
 * Empty default — stages are added in Phase 1.3 (`requestLogging`,
 * `cors`, `rateLimit`, `errorMapper`, `responseWrapper`) and Phase 2
 * (`authExtractor`, `consentGuard`, `emailVerifiedGuard`,
 * `humanRelativeDates`). Until then, the adapter applies its existing
 * Nest pipes/filters/interceptors, and `Route.skip` is a no-op.
 */
export const defaultPipeline: readonly PipelineStage[] = [];
