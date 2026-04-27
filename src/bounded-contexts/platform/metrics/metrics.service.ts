import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, collectDefaultMetrics, Gauge, Histogram, Registry } from 'prom-client';
import {
  type MetricsOverviewSnapshot,
  MetricsReaderPort,
} from './domain/ports/metrics-reader.port';

type CounterLabels = Record<string, string>;

interface ResumeCreatedLabels {
  templateId?: string;
  [key: string]: string | undefined;
}

interface UserSignupLabels {
  method?: string;
  [key: string]: string | undefined;
}

interface ExportLabels {
  format: string;
  [key: string]: string;
}

interface ApiLatencyLabels {
  method: string;
  route: string;
  status: string;
  [key: string]: string;
}

/** Labels for the scoring subsystem.
 * - `type` discriminates which score family fired (resume_quality | match).
 * - `outcome` reflects degradation: success = all sub-scores filled,
 *   partial = at least one degraded to null, failed = the use case threw.
 *   Cache hits count as `success` regardless of which sub-scores ran when
 *   the value was originally computed — the histogram captures the
 *   read-path cost, not the underlying compute work. */
interface ScoreComputedLabels {
  type: 'resume_quality' | 'match';
  outcome: 'success' | 'partial' | 'failed';
  [key: string]: string;
}

@Injectable()
export class MetricsService extends MetricsReaderPort implements OnModuleInit {
  private readonly registry: Registry;

  // Counters
  private readonly resumeCreatedCounter: Counter<string>;
  private readonly userSignupCounter: Counter<string>;
  private readonly exportCompletedCounter: Counter<string>;
  private readonly scoreComputedCounter: Counter<string>;

  // Histograms
  private readonly exportDurationHistogram: Histogram<string>;
  private readonly apiLatencyHistogram: Histogram<string>;
  private readonly scoreComputeDurationHistogram: Histogram<string>;

  // Gauges
  private readonly activeUsersGauge: Gauge<string>;
  private readonly pendingExportsGauge: Gauge<string>;

  constructor() {
    super();
    this.registry = new Registry();

    // Counters
    this.resumeCreatedCounter = new Counter({
      name: 'resume_created_total',
      help: 'Total number of resumes created',
      labelNames: ['templateId'],
      registers: [this.registry],
    });

    this.userSignupCounter = new Counter({
      name: 'user_signup_total',
      help: 'Total number of user signups',
      labelNames: ['method'],
      registers: [this.registry],
    });

    this.exportCompletedCounter = new Counter({
      name: 'export_completed_total',
      help: 'Total number of exports completed',
      labelNames: ['format'],
      registers: [this.registry],
    });

    this.scoreComputedCounter = new Counter({
      name: 'score_computed_total',
      help: 'Scoring-subsystem computations completed, by score family and degradation outcome',
      labelNames: ['type', 'outcome'],
      registers: [this.registry],
    });

    // Histograms
    this.exportDurationHistogram = new Histogram({
      name: 'export_duration_seconds',
      help: 'Duration of export operations in seconds',
      labelNames: ['format'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    this.apiLatencyHistogram = new Histogram({
      name: 'api_latency_seconds',
      help: 'API request latency in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    // Buckets fit cache-hit reads (~10ms) up to full match recomputes
    // that fan out to embeddings + LLM (~5–15s wall-clock).
    this.scoreComputeDurationHistogram = new Histogram({
      name: 'score_compute_duration_seconds',
      help: 'Wall-clock duration of a single scoring use-case execution',
      labelNames: ['type'],
      buckets: [0.01, 0.05, 0.25, 1, 3, 8, 20],
      registers: [this.registry],
    });

    // Gauges
    this.activeUsersGauge = new Gauge({
      name: 'active_users_total',
      help: 'Current number of active users',
      registers: [this.registry],
    });

    this.pendingExportsGauge = new Gauge({
      name: 'pending_exports_total',
      help: 'Current number of pending exports',
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry });
  }

  // Counter methods
  incrementResumeCreated(labels?: ResumeCreatedLabels): void {
    if (labels) {
      this.resumeCreatedCounter.inc(labels);
    } else {
      this.resumeCreatedCounter.inc();
    }
  }

  incrementUserSignup(labels?: UserSignupLabels): void {
    if (labels) {
      this.userSignupCounter.inc(labels);
    } else {
      this.userSignupCounter.inc();
    }
  }

  incrementExportCompleted(labels: ExportLabels): void {
    this.exportCompletedCounter.inc(labels);
  }

  // Histogram methods
  observeExportDuration(durationSeconds: number, labels: ExportLabels): void {
    this.exportDurationHistogram.observe(labels, durationSeconds);
  }

  startExportTimer(labels: ExportLabels): () => number {
    return this.exportDurationHistogram.startTimer(labels);
  }

  observeApiLatency(durationSeconds: number, labels: ApiLatencyLabels): void {
    this.apiLatencyHistogram.observe(labels, durationSeconds);
  }

  startApiTimer(labels: ApiLatencyLabels): () => number {
    return this.apiLatencyHistogram.startTimer(labels);
  }

  // Scoring subsystem
  incrementScoreComputed(labels: ScoreComputedLabels): void {
    this.scoreComputedCounter.inc(labels);
  }

  observeScoreComputeDuration(
    durationSeconds: number,
    labels: { type: ScoreComputedLabels['type']; [key: string]: string },
  ): void {
    this.scoreComputeDurationHistogram.observe(labels, durationSeconds);
  }

  // Gauge methods
  setActiveUsers(count: number): void {
    this.activeUsersGauge.set(count);
  }

  incrementActiveUsers(): void {
    this.activeUsersGauge.inc();
  }

  decrementActiveUsers(): void {
    this.activeUsersGauge.dec();
  }

  setPendingExports(count: number): void {
    this.pendingExportsGauge.set(count);
  }

  incrementPendingExports(): void {
    this.pendingExportsGauge.inc();
  }

  decrementPendingExports(): void {
    this.pendingExportsGauge.dec();
  }

  // Prometheus output
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /** MetricsReaderPort surface — alias of `getMetrics` so the use case
   *  layer doesn't import the historical name. */
  getPrometheusText(): Promise<string> {
    return this.getMetrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  // For testing - uses async get() API from prom-client v15
  async getMetricValue(name: string, labels?: CounterLabels): Promise<number> {
    const metric = this.registry.getSingleMetric(name);
    if (!metric) return 0;

    const metricData = await metric.get();
    const values = metricData.values;

    if (!labels) {
      // Return sum of all values if no labels specified
      return values.reduce((acc, v) => acc + v.value, 0);
    }

    // Find matching entry by labels
    const matchingEntry = values.find((v) => {
      const entryLabels = v.labels as CounterLabels;
      return Object.entries(labels).every(([key, value]) => entryLabels[key] === value);
    });

    return matchingEntry?.value ?? 0;
  }

  getHistogramMetric(name: string): Histogram<string> | undefined {
    return this.registry.getSingleMetric(name) as Histogram<string> | undefined;
  }

  resetMetrics(): void {
    this.registry.resetMetrics();
  }

  /**
   * Get all metrics as structured JSON for admin dashboard.
   * Parses the Prometheus registry into a more convenient format.
   */
  async getMetricsJson(): Promise<Record<string, unknown>> {
    const metrics = await this.registry.getMetricsAsJSON();
    const result: Record<string, unknown> = {};

    for (const metric of metrics) {
      result[metric.name] = { help: metric.help, type: metric.type, values: metric.values };
    }

    return result;
  }

  /**
   * Get API latency summary grouped by route.
   * Returns p50, p95, p99, count, and rate for each route.
   */
  async getLatencySummary(): Promise<Record<string, unknown>[]> {
    const metricData = await this.apiLatencyHistogram.get();
    const routeMap = new Map<
      string,
      { count: number; sum: number; buckets: Map<number, number> }
    >();

    for (const value of metricData.values) {
      const labels = value.labels as Record<string, string>;
      const route = `${labels.method} ${labels.route}`;

      let entry = routeMap.get(route);
      if (!entry) {
        entry = { count: 0, sum: 0, buckets: new Map() };
        routeMap.set(route, entry);
      }

      if (value.metricName?.endsWith('_count') || (!value.metricName && labels.le === undefined)) {
        if (labels.le === undefined) {
          entry.count += value.value;
        }
      }
      if (value.metricName?.endsWith('_sum')) {
        entry.sum += value.value;
      }
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

  /**
   * Aggregated overview used by the admin dashboard. Computing it here keeps
   * the controller free of prometheus-shape parsing and metric arithmetic.
   */
  async getOverviewSnapshot(): Promise<MetricsOverviewSnapshot> {
    const [metricsJson, latencySummary] = await Promise.all([
      this.getMetricsJson(),
      this.getLatencySummary(),
    ]);

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
        resumeCreated: MetricsService.sumValues(resumeCreated),
        userSignups: MetricsService.sumValues(userSignups),
        exportCompleted: MetricsService.sumValues(exportCompleted),
      },
      gauges: {
        activeUsers: MetricsService.sumValues(activeUsers),
        pendingExports: MetricsService.sumValues(pendingExports),
      },
      process: {
        uptimeSeconds: processUptime
          ? Math.round(Date.now() / 1000 - MetricsService.firstValue(processUptime))
          : 0,
        heapUsedMb: heapUsed ? Math.round(MetricsService.firstValue(heapUsed) / 1024 / 1024) : 0,
        heapTotalMb: heapTotal ? Math.round(MetricsService.firstValue(heapTotal) / 1024 / 1024) : 0,
        eventLoopLagMs: eventLoopLag
          ? Math.round(MetricsService.firstValue(eventLoopLag) * 1000 * 100) / 100
          : 0,
      },
      latency: latencySummary,
    };
  }

  private static sumValues(metric: Record<string, unknown> | undefined): number {
    if (!metric?.values) return 0;
    const values = metric.values as { value: number }[];
    let total = 0;
    for (const v of values) total += v.value;
    return total;
  }

  private static firstValue(metric: Record<string, unknown> | undefined): number {
    if (!metric?.values) return 0;
    const values = metric.values as { value: number }[];
    return values[0]?.value ?? 0;
  }
}
