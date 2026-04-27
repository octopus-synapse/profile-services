/**
 * Explicit registration of metrics-BC event handlers.
 *
 * The handler is a framework-free POJO; this file wires its two
 * methods to the `EventBusPort` for the corresponding domain events.
 */

import { MatchComputedEvent } from '@/bounded-contexts/job-match/domain/events';
import { ResumeQualityComputedEvent } from '@/bounded-contexts/resume-quality/domain/events';
import type { EventBusPort, LoggerPort } from '@/shared-kernel';
import type { MetricsService } from '../metrics.service';
import { ScoreMetricsHandler } from './score-metrics.handler';

export interface MetricsHandlersDeps {
  readonly eventBus: EventBusPort;
  readonly metrics: MetricsService;
  readonly logger: LoggerPort;
}

export function registerMetricsHandlers(deps: MetricsHandlersDeps): void {
  const { eventBus, metrics, logger } = deps;

  const handler = new ScoreMetricsHandler(metrics, logger);

  eventBus.on(
    ResumeQualityComputedEvent.TYPE,
    handler.onResumeQualityComputed.bind(handler),
  );
  eventBus.on(MatchComputedEvent.TYPE, handler.onMatchComputed.bind(handler));
}
