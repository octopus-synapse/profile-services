/**
 * Bundle token for the metrics BC. Doubles as the TypeScript shape and
 * the Nest DI token. Wiring lives in `metrics.composition.ts` —
 * Nest-free.
 */

import type { GetMetricsOverviewUseCase } from '../use-cases/get-metrics-overview/get-metrics-overview.use-case';
import type { GetPrometheusMetricsUseCase } from '../use-cases/get-prometheus-metrics/get-prometheus-metrics.use-case';

export abstract class MetricsUseCases {
  abstract readonly getPrometheusMetrics: GetPrometheusMetricsUseCase;
  abstract readonly getMetricsOverview: GetMetricsOverviewUseCase;
}
