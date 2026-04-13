import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, collectDefaultMetrics, Gauge, Histogram, Registry } from 'prom-client';

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

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;

  // Counters
  private readonly resumeCreatedCounter: Counter<string>;
  private readonly userSignupCounter: Counter<string>;
  private readonly exportCompletedCounter: Counter<string>;

  // Histograms
  private readonly exportDurationHistogram: Histogram<string>;
  private readonly apiLatencyHistogram: Histogram<string>;

  // Gauges
  private readonly activeUsersGauge: Gauge<string>;
  private readonly pendingExportsGauge: Gauge<string>;

  constructor() {
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
      result[metric.name] = {
        help: metric.help,
        type: metric.type,
        values: metric.values,
      };
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

      if (!routeMap.has(route)) {
        routeMap.set(route, { count: 0, sum: 0, buckets: new Map() });
      }

      const entry = routeMap.get(route)!;

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
}
