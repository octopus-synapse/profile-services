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

import {
  ExportCompletedEvent,
  ExportFailedEvent,
  ExportRequestedEvent,
} from '@/bounded-contexts/export/domain/events';
// `UserLoggedInEvent` / `UserLoggedOutEvent` use instance-level
// `eventType` (no static TYPE), so we subscribe via the literal
// strings below — no import needed for the type.
import { UserRegisteredEvent } from '@/bounded-contexts/identity/shared-kernel/domain/events/user-registered.event';
import { MatchComputedEvent } from '@/bounded-contexts/job-match/domain/events';
import { ResumeQualityComputedEvent } from '@/bounded-contexts/resume-quality/domain/events';
import { ResumeCreatedEvent } from '@/bounded-contexts/resumes/domain/events/resume-created.event';
import type { LoggerPort } from '@/shared-kernel';
import type { BcEventBinding, BoundedContextComposition } from '@/shared-kernel/composition';
import type { Lifecycle } from '@/shared-kernel/lifecycle';
import { MetricsUseCases } from './application/ports/metrics.port';
import { GetMetricsOverviewUseCase } from './application/use-cases/get-metrics-overview/get-metrics-overview.use-case';
import { GetPrometheusMetricsUseCase } from './application/use-cases/get-prometheus-metrics/get-prometheus-metrics.use-case';
import type { MetricsReaderPort } from './domain/ports/metrics-reader.port';
import { LifecycleMetricsHandler } from './handlers/lifecycle-metrics.handler';
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
  const lifecycleHandler = new LifecycleMetricsHandler(metrics, logger);

  const eventHandlers: ReadonlyArray<BcEventBinding> = [
    {
      eventType: ResumeQualityComputedEvent.TYPE,
      handler: scoreHandler.onResumeQualityComputed.bind(scoreHandler) as BcEventBinding['handler'],
    },
    {
      eventType: MatchComputedEvent.TYPE,
      handler: scoreHandler.onMatchComputed.bind(scoreHandler) as BcEventBinding['handler'],
    },
    // P1-023 — wire the 5 dormant Prometheus signals to their domain
    // events. `api_latency_seconds` is observed in the HTTP pipeline
    // instead of here because latency belongs to the request, not the
    // domain bus.
    {
      eventType: ResumeCreatedEvent.TYPE,
      handler: lifecycleHandler.onResumeCreated.bind(lifecycleHandler) as BcEventBinding['handler'],
    },
    {
      eventType: UserRegisteredEvent.TYPE,
      handler: lifecycleHandler.onUserRegistered.bind(
        lifecycleHandler,
      ) as BcEventBinding['handler'],
    },
    {
      eventType: 'auth.user.logged_in', // UserLoggedInEvent.eventType (string-literal)
      handler: lifecycleHandler.onUserLoggedIn.bind(lifecycleHandler) as BcEventBinding['handler'],
    },
    {
      eventType: 'auth.user.logged_out',
      handler: lifecycleHandler.onUserLoggedOut.bind(lifecycleHandler) as BcEventBinding['handler'],
    },
    {
      eventType: ExportRequestedEvent.TYPE,
      handler: lifecycleHandler.onExportRequested.bind(
        lifecycleHandler,
      ) as BcEventBinding['handler'],
    },
    {
      eventType: ExportCompletedEvent.TYPE,
      handler: lifecycleHandler.onExportCompleted.bind(
        lifecycleHandler,
      ) as BcEventBinding['handler'],
    },
    {
      eventType: ExportFailedEvent.TYPE,
      handler: lifecycleHandler.onExportFailed.bind(lifecycleHandler) as BcEventBinding['handler'],
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
