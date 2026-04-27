/**
 * Outbound port for reading exposed metric values. The use cases
 * never see `prom-client`; they ask for the Prometheus text or the
 * structured overview, and the adapter (`MetricsService`) does the
 * registry walk.
 */

export interface MetricsOverviewSnapshot {
  readonly counters: { resumeCreated: number; userSignups: number; exportCompleted: number };
  readonly gauges: { activeUsers: number; pendingExports: number };
  readonly process: {
    uptimeSeconds: number;
    heapUsedMb: number;
    heapTotalMb: number;
    eventLoopLagMs: number;
  };
  readonly latency: Record<string, unknown>[];
}

export abstract class MetricsReaderPort {
  abstract getPrometheusText(): Promise<string>;
  abstract getOverviewSnapshot(): Promise<MetricsOverviewSnapshot>;
}
