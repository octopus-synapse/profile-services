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
 * Default pipeline. Phase 1.3 ships the response-wrapper stage (pure
 * counterpart to `ApiResponseInterceptor`). Phase 2 grows this list
 * as ports for error mapping, request logging, cors, rate-limit, and
 * auth come online. Until then, the Nest adapter still runs Nest's
 * own interceptor/filter chain — `Route.skip` is parsed but its only
 * effect today is on the response wrapper.
 */
import { responseWrapperStage } from './stages';

export const defaultPipeline: readonly PipelineStage[] = [responseWrapperStage];
