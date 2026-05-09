/**
 * Route descriptors for the metrics BC. Replaces
 * `AdminMetricsController` and `MetricsController`. The Prometheus
 * `/metrics` endpoint is gated by `MetricsGuard` (X-Metrics-Key
 * header) — registered in `metrics.module.ts` against the synthesizer
 * guard registry under the id `metrics-key`.
 */

import { z } from 'zod';

// ─── Response schema for the JSON overview ────────────────────────────
// The latency entries come from `MetricsService.getLatencySummary` which
// pushes `{ route, totalRequests, avgLatencyMs, totalDurationS }`. The
// reader port types it loosely as `Record<string, unknown>[]` so we
// capture the structured fields explicitly here and let any future
// additions be picked up via `passthrough`.
export const LatencyEntrySchema = z
  .object({
    route: z.string(),
    totalRequests: z.number(),
    avgLatencyMs: z.number(),
    totalDurationS: z.number(),
  })
  .passthrough();

export const MetricsOverviewResponseSchema = z.object({
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
