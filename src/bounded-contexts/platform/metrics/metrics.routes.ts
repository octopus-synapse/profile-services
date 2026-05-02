/**
 * Route descriptors for the metrics BC. Replaces
 * `AdminMetricsController` and `MetricsController`. The Prometheus
 * `/metrics` endpoint is gated by `MetricsGuard` (X-Metrics-Key
 * header) — registered in `metrics.module.ts` against the synthesizer
 * guard registry under the id `metrics-key`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { MetricsUseCases } from './application/ports/metrics.port';

// ─── Response schema for the JSON overview ────────────────────────────
// The latency entries come from `MetricsService.getLatencySummary` which
// pushes `{ route, totalRequests, avgLatencyMs, totalDurationS }`. The
// reader port types it loosely as `Record<string, unknown>[]` so we
// capture the structured fields explicitly here and let any future
// additions be picked up via `passthrough`.
const LatencyEntrySchema = z
  .object({
    route: z.string(),
    totalRequests: z.number(),
    avgLatencyMs: z.number(),
    totalDurationS: z.number(),
  })
  .passthrough();

const MetricsOverviewResponseSchema = z.object({
  counters: z.object({
    resumeCreated: z.number(),
    userSignups: z.number(),
    exportCompleted: z.number(),
  }),
  gauges: z.object({
    activeUsers: z.number(),
    pendingExports: z.number(),
  }),
  process: z.object({
    uptimeSeconds: z.number(),
    heapUsedMb: z.number(),
    heapTotalMb: z.number(),
    eventLoopLagMs: z.number(),
  }),
  latency: z.array(LatencyEntrySchema),
});

export const metricsRoutes: ReadonlyArray<Route<MetricsUseCases>> = [
  {
    method: 'GET',
    path: '/v1/admin/metrics/overview',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_MANAGE,
    response: MetricsOverviewResponseSchema,
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
