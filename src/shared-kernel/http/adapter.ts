/**
 * Framework adapter contract. An adapter takes a list of `Route`
 * descriptors plus a global pipeline and serves them — Nest today,
 * Elysia/Fastify/Hono tomorrow.
 *
 * Adapters live under `src/infrastructure/<name>-adapter/`; this file
 * is the only contract every adapter must satisfy. `RouteAdapter` is
 * the minimum surface; concrete adapters can expose richer APIs (e.g.
 * `nestAdapter.module()` to obtain the synthesized module token), but
 * `bootstrap()` only needs the methods declared here.
 */

import type { PipelineStage } from './pipeline';
import type { Route } from './route.types';

export interface BootstrapOptions {
  readonly routes: readonly Route[];
  readonly pipeline: readonly PipelineStage[];
  readonly port: number;
}

export interface RouteAdapter {
  /**
   * Boots the HTTP server with the supplied routes + pipeline. Returns
   * a stop function the caller invokes during graceful shutdown.
   */
  start(opts: BootstrapOptions): Promise<() => Promise<void>>;
}
