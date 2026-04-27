/**
 * Route descriptors for the metrics BC. Replaces
 * `AdminMetricsController` and `MetricsController`. The Prometheus
 * `/metrics` endpoint is gated by `MetricsGuard` (X-Metrics-Key
 * header) — registered in `metrics.module.ts` against the synthesizer
 * guard registry under the id `metrics-key`.
 */

import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { MetricsUseCases } from './application/ports/metrics.port';

export const metricsRoutes: ReadonlyArray<Route<MetricsUseCases>> = [
  {
    method: 'GET',
    path: '/v1/admin/metrics/overview',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_MANAGE,
    openapi: {
      summary: 'Get all metrics as JSON',
      tags: ['admin-metrics'],
      description: 'Admin Metrics API',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => bc.getMetricsOverview.execute(),
  },
  {
    method: 'GET',
    path: '/metrics',
    auth: { kind: 'public' },
    guards: [{ id: 'metrics-key' }],
    headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
    openapi: {
      summary: 'Get Prometheus metrics',
      tags: ['Metrics'],
      description: 'Returns service metrics in Prometheus exposition format.',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => bc.getPrometheusMetrics.execute(),
  },
];
