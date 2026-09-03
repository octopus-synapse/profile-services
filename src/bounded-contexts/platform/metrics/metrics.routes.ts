/**
 * Route descriptors for the metrics BC. Replaces
 * `AdminMetricsController` and `MetricsController`. The Prometheus
 * `/metrics` endpoint is gated by `MetricsGuard` (X-Metrics-Key
 * header) — registered in `metrics.module.ts` against the synthesizer
 * guard registry under the id `metrics-key`.
 */

import type { Route } from '@/shared-kernel/http/route.types';
import { MetricsUseCases } from './application/ports/metrics.port';

export const metricsRoutes: ReadonlyArray<Route<MetricsUseCases>> = [
  {
    method: 'GET',
    path: '/metrics',
    auth: { kind: 'public' },
    guards: [{ id: 'metrics-key' }],
    headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
    // No `response` schema: this endpoint serves the Prometheus exposition
    // format (`text/plain`), not JSON.
    openapi: {
      summary: 'Get Prometheus metrics',
      tags: ['metrics'],
      description: 'Returns service metrics in Prometheus exposition format.',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => bc.getPrometheusMetrics.execute(),
  },
];
