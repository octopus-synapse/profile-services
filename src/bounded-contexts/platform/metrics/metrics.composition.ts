/**
 * Pure-TS wiring for the metrics BC. Zero `@nestjs/*` imports.
 */

import { MetricsUseCases } from './application/ports/metrics.port';
import { GetMetricsOverviewUseCase } from './application/use-cases/get-metrics-overview/get-metrics-overview.use-case';
import { GetPrometheusMetricsUseCase } from './application/use-cases/get-prometheus-metrics/get-prometheus-metrics.use-case';
import type { MetricsReaderPort } from './domain/ports/metrics-reader.port';

export { MetricsUseCases };

export function buildMetricsUseCases(reader: MetricsReaderPort): MetricsUseCases {
  return {
    getPrometheusMetrics: new GetPrometheusMetricsUseCase(reader),
    getMetricsOverview: new GetMetricsOverviewUseCase(reader),
  };
}
