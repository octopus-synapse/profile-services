/**
 * Request-logging pipeline stage. Outermost stage in the default
 * pipeline: its `finally` runs after the inner stages (and the mounter)
 * have settled the response, so it logs the *final* status + wall-clock
 * duration and feeds the same measurement into the Prometheus latency
 * histogram.
 */

import type { PipelineStage } from '@/shared-kernel/http/pipeline';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';

/** Prometheus latency observer — see `PipelineDeps.observeApiLatency`. */
export type ObserveApiLatency = (
  durationSeconds: number,
  labels: { method: string; route: string; status: string },
) => void;

export function requestLoggingStage(deps: {
  readonly logger: LoggerPort;
  readonly observeApiLatency?: ObserveApiLatency;
}): PipelineStage {
  return {
    name: 'requestLogging',
    async run(ctx, next) {
      const start = Date.now();
      try {
        await next();
      } finally {
        const duration = Date.now() - start;
        const status = (ctx.state.responseStatus as number | undefined) ?? 200;
        deps.logger.log(`${ctx.method} ${ctx.path} ${status} ${duration}ms`, 'ElysiaPipeline', {
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        });
        // P1-023 / P2-#26 — feed the same measurement into the Prometheus
        // histogram. Use the route template (`/v1/users/:userId`) when
        // available so we don't blow up label cardinality. If the
        // mounter didn't tag the matched route (404, OPTIONS preflight,
        // etc.) bucket under `<unmatched>` instead of the literal
        // `ctx.path` — the previous fallback to `ctx.path` let cardinality
        // explode whenever an unrouted request slipped in with a UUID in
        // the URL.
        if (deps.observeApiLatency) {
          const route = (ctx.state.__route as { path?: string } | undefined)?.path ?? '<unmatched>';
          deps.observeApiLatency(duration / 1000, {
            method: ctx.method,
            route,
            status: String(status),
          });
        }
      }
    },
  };
}
