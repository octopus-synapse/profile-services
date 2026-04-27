/**
 * Route descriptors for the metrics BC. Replaces
 * `AdminMetricsController`. The Prometheus `/metrics` endpoint stays
 * as a legacy `MetricsController` because it is gated by the custom
 * `MetricsGuard` (X-Metrics-Key header) which the synthesizer does not
 * yet model.
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
];
