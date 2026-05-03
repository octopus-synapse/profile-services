import type { Histogram } from 'prom-client';
import type { MetricsOverviewSnapshot } from '../domain/ports/metrics-reader.port';

export async function getLatencySummary(
  apiLatencyHistogram: Histogram<string>,
): Promise<Record<string, unknown>[]> {
  const metricData = await apiLatencyHistogram.get();
  const routeMap = new Map<string, { count: number; sum: number; buckets: Map<number, number> }>();

  for (const value of metricData.values) {
    const labels = value.labels as Record<string, string>;
    const route = `${labels.method} ${labels.route}`;

    let entry = routeMap.get(route);
    if (!entry) {
      entry = { count: 0, sum: 0, buckets: new Map() };
      routeMap.set(route, entry);
    }

    if (value.metricName?.endsWith('_count') || (!value.metricName && labels.le === undefined)) {
      if (labels.le === undefined) entry.count += value.value;
    }
    if (value.metricName?.endsWith('_sum')) entry.sum += value.value;
    if (labels.le !== undefined) {
      const bucket = Number(labels.le);
      entry.buckets.set(bucket, (entry.buckets.get(bucket) ?? 0) + value.value);
    }
  }

  const results: Record<string, unknown>[] = [];
  for (const [route, data] of routeMap) {
    const avgMs = data.count > 0 ? (data.sum / data.count) * 1000 : 0;
    results.push({
      route,
      totalRequests: data.count,
      avgLatencyMs: Math.round(avgMs * 100) / 100,
      totalDurationS: Math.round(data.sum * 100) / 100,
    });
  }

  return results.sort((a, b) => (b.totalRequests as number) - (a.totalRequests as number));
}

function sumValues(metric: Record<string, unknown> | undefined): number {
  if (!metric?.values) return 0;
  const values = metric.values as { value: number }[];
  let total = 0;
  for (const v of values) total += v.value;
  return total;
}

function firstValue(metric: Record<string, unknown> | undefined): number {
  if (!metric?.values) return 0;
  const values = metric.values as { value: number }[];
  return values[0]?.value ?? 0;
}

export async function buildOverviewSnapshot(
  metricsJson: Record<string, unknown>,
  latencySummary: Record<string, unknown>[],
): Promise<MetricsOverviewSnapshot> {
  const asMetric = (name: string) => metricsJson[name] as Record<string, unknown> | undefined;

  const resumeCreated = asMetric('resume_created_total');
  const userSignups = asMetric('user_signup_total');
  const exportCompleted = asMetric('export_completed_total');
  const activeUsers = asMetric('active_users_total');
  const pendingExports = asMetric('pending_exports_total');
  const processUptime = asMetric('process_start_time_seconds');
  const heapUsed = asMetric('nodejs_heap_size_used_bytes');
  const heapTotal = asMetric('nodejs_heap_size_total_bytes');
  const eventLoopLag = asMetric('nodejs_eventloop_lag_seconds');

  return {
    counters: {
      resumeCreated: sumValues(resumeCreated),
      userSignups: sumValues(userSignups),
      exportCompleted: sumValues(exportCompleted),
    },
    gauges: {
      activeUsers: sumValues(activeUsers),
      pendingExports: sumValues(pendingExports),
    },
    process: {
      uptimeSeconds: processUptime ? Math.round(Date.now() / 1000 - firstValue(processUptime)) : 0,
      heapUsedMb: heapUsed ? Math.round(firstValue(heapUsed) / 1024 / 1024) : 0,
      heapTotalMb: heapTotal ? Math.round(firstValue(heapTotal) / 1024 / 1024) : 0,
      eventLoopLagMs: eventLoopLag ? Math.round(firstValue(eventLoopLag) * 1000 * 100) / 100 : 0,
    },
    latency: latencySummary,
  };
}
