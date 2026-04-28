/**
 * Pure-TS wiring for the metrics BC. Zero `@nestjs/*` imports.
 *
 * Phase-1 canonical shape: returns
 * `{ useCases, routes, lifecycles, eventHandlers, metrics }` as a
 * `BoundedContextComposition`. The `metrics` extra exposes the same
 * `MetricsService` so other BCs that record (incrementResumeCreated
 * etc.) can grab it from the composition rather than reaching into
 * the BC.
 *
 * The `/metrics` Prometheus text endpoint is mounted as one of the
 * route descriptors and gated by `MetricsGuard` (still Nest-coupled
 * — registered against the route synthesizer's guard registry under
 * id `metrics-key`).
 */

import { MatchComputedEvent } from '@/bounded-contexts/job-match/domain/events';
import { ResumeQualityComputedEvent } from '@/bounded-contexts/resume-quality/domain/events';
import type { LoggerPort } from '@/shared-kernel';
import type { BcEventBinding, BoundedContextComposition } from '@/shared-kernel/composition';
import type { Lifecycle } from '@/shared-kernel/lifecycle';
import { MetricsUseCases } from './application/ports/metrics.port';
import { GetMetricsOverviewUseCase } from './application/use-cases/get-metrics-overview/get-metrics-overview.use-case';
import { GetPrometheusMetricsUseCase } from './application/use-cases/get-prometheus-metrics/get-prometheus-metrics.use-case';
import type { MetricsReaderPort } from './domain/ports/metrics-reader.port';
import { ScoreMetricsHandler } from './handlers/score-metrics.handler';
import { metricsRoutes } from './metrics.routes';
import { MetricsService } from './metrics.service';

export { MetricsUseCases };

export function buildMetricsUseCases(reader: MetricsReaderPort): MetricsUseCases {
  return {
    getPrometheusMetrics: new GetPrometheusMetricsUseCase(reader),
    getMetricsOverview: new GetMetricsOverviewUseCase(reader),
  };
}

export interface MetricsCompositionExtras {
  /** Concrete recorder + reader. Kept on the composition so cross-BC
   *  call sites can record via `metrics.incrementXxx(...)` without
   *  importing the BC's internals. */
  readonly metrics: MetricsService;
}

export function buildMetricsComposition(
  logger: LoggerPort,
): BoundedContextComposition<MetricsUseCases> & MetricsCompositionExtras {
  const metrics = new MetricsService();
  const useCases = buildMetricsUseCases(metrics);

  // --- Lifecycle: register default-metrics collection on init ---
  const lifecycles: ReadonlyArray<Lifecycle> = [
    {
      init: async (): Promise<void> => {
        await metrics.init?.();
      },
    },
  ];

  // --- Event handlers (POJO `@OnEvent` replacements) ---
  const scoreHandler = new ScoreMetricsHandler(metrics, logger);

  const eventHandlers: ReadonlyArray<BcEventBinding> = [
    {
      eventType: ResumeQualityComputedEvent.TYPE,
      handler: scoreHandler.onResumeQualityComputed.bind(scoreHandler) as BcEventBinding['handler'],
    },
    {
      eventType: MatchComputedEvent.TYPE,
      handler: scoreHandler.onMatchComputed.bind(scoreHandler) as BcEventBinding['handler'],
    },
  ];

  return {
    useCases,
    routes: metricsRoutes,
    lifecycles,
    eventHandlers,
    metrics,
  };
}
