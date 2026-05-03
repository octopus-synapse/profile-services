import type { Histogram } from 'prom-client';
import { collectDefaultMetrics } from 'prom-client';
import type { Lifecycle } from '@/shared-kernel/lifecycle';
import {
  type MetricsOverviewSnapshot,
  MetricsReaderPort,
} from './domain/ports/metrics-reader.port';
import type {
  ApiLatencyLabels,
  CounterLabels,
  ExportLabels,
  ResumeCreatedLabels,
  ScoreComputedLabels,
  UserSignupLabels,
} from './internal/metrics-labels.types';
import { buildOverviewSnapshot, getLatencySummary } from './internal/metrics-overview.service';
import { createMetricsRegistry, type MetricsRegistry } from './internal/metrics-registry.factory';

export class MetricsService extends MetricsReaderPort implements Lifecycle {
  private readonly metrics: MetricsRegistry;

  constructor() {
    super();
    this.metrics = createMetricsRegistry();
  }

  async init(): Promise<void> {
    collectDefaultMetrics({ register: this.metrics.registry });
  }

  // Counter methods
  incrementResumeCreated(labels?: ResumeCreatedLabels): void {
    if (labels) this.metrics.counters.resumeCreated.inc(labels);
    else this.metrics.counters.resumeCreated.inc();
  }

  incrementUserSignup(labels?: UserSignupLabels): void {
    if (labels) this.metrics.counters.userSignup.inc(labels);
    else this.metrics.counters.userSignup.inc();
  }

  incrementExportCompleted(labels: ExportLabels): void {
    this.metrics.counters.exportCompleted.inc(labels);
  }

  // Histogram methods
  observeExportDuration(durationSeconds: number, labels: ExportLabels): void {
    this.metrics.histograms.exportDuration.observe(labels, durationSeconds);
  }

  startExportTimer(labels: ExportLabels): () => number {
    return this.metrics.histograms.exportDuration.startTimer(labels);
  }

  observeApiLatency(durationSeconds: number, labels: ApiLatencyLabels): void {
    this.metrics.histograms.apiLatency.observe(labels, durationSeconds);
  }

  startApiTimer(labels: ApiLatencyLabels): () => number {
    return this.metrics.histograms.apiLatency.startTimer(labels);
  }

  // Scoring subsystem
  incrementScoreComputed(labels: ScoreComputedLabels): void {
    this.metrics.counters.scoreComputed.inc(labels);
  }

  observeScoreComputeDuration(
    durationSeconds: number,
    labels: { type: ScoreComputedLabels['type']; [key: string]: string },
  ): void {
    this.metrics.histograms.scoreComputeDuration.observe(labels, durationSeconds);
  }

  // Gauge methods
  setActiveUsers(count: number): void {
    this.metrics.gauges.activeUsers.set(count);
  }
  incrementActiveUsers(): void {
    this.metrics.gauges.activeUsers.inc();
  }
  decrementActiveUsers(): void {
    this.metrics.gauges.activeUsers.dec();
  }
  setPendingExports(count: number): void {
    this.metrics.gauges.pendingExports.set(count);
  }
  incrementPendingExports(): void {
    this.metrics.gauges.pendingExports.inc();
  }
  decrementPendingExports(): void {
    this.metrics.gauges.pendingExports.dec();
  }

  // Prometheus output
  async getMetrics(): Promise<string> {
    return this.metrics.registry.metrics();
  }

  /** MetricsReaderPort surface — alias of `getMetrics`. */
  getPrometheusText(): Promise<string> {
    return this.getMetrics();
  }

  getContentType(): string {
    return this.metrics.registry.contentType;
  }

  // For testing
  async getMetricValue(name: string, labels?: CounterLabels): Promise<number> {
    const metric = this.metrics.registry.getSingleMetric(name);
    if (!metric) return 0;
    const metricData = await metric.get();
    const values = metricData.values;
    if (!labels) return values.reduce((acc, v) => acc + v.value, 0);
    const matching = values.find((v) => {
      const entryLabels = v.labels as CounterLabels;
      return Object.entries(labels).every(([key, value]) => entryLabels[key] === value);
    });
    return matching?.value ?? 0;
  }

  getHistogramMetric(name: string): Histogram<string> | undefined {
    return this.metrics.registry.getSingleMetric(name) as Histogram<string> | undefined;
  }

  resetMetrics(): void {
    this.metrics.registry.resetMetrics();
  }

  async getMetricsJson(): Promise<Record<string, unknown>> {
    const metrics = await this.metrics.registry.getMetricsAsJSON();
    const result: Record<string, unknown> = {};
    for (const metric of metrics) {
      result[metric.name] = { help: metric.help, type: metric.type, values: metric.values };
    }
    return result;
  }

  async getLatencySummary(): Promise<Record<string, unknown>[]> {
    return getLatencySummary(this.metrics.histograms.apiLatency);
  }

  async getOverviewSnapshot(): Promise<MetricsOverviewSnapshot> {
    const [metricsJson, latencySummary] = await Promise.all([
      this.getMetricsJson(),
      this.getLatencySummary(),
    ]);
    return buildOverviewSnapshot(metricsJson, latencySummary);
  }
}
