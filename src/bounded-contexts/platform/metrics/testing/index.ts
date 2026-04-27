/**
 * In-memory `MetricsReaderPort` for use case specs. Both the
 * Prometheus text and the overview snapshot are seedable; there's no
 * registry walk, so tests stay focused on use case behavior.
 */

import {
  type MetricsOverviewSnapshot,
  MetricsReaderPort,
} from '../domain/ports/metrics-reader.port';

const EMPTY_SNAPSHOT: MetricsOverviewSnapshot = {
  counters: { resumeCreated: 0, userSignups: 0, exportCompleted: 0 },
  gauges: { activeUsers: 0, pendingExports: 0 },
  process: { uptimeSeconds: 0, heapUsedMb: 0, heapTotalMb: 0, eventLoopLagMs: 0 },
  latency: [],
};

export class InMemoryMetricsReader extends MetricsReaderPort {
  private prometheusText = '';
  private snapshot: MetricsOverviewSnapshot = EMPTY_SNAPSHOT;

  seedPrometheusText(text: string): void {
    this.prometheusText = text;
  }

  seedSnapshot(snapshot: MetricsOverviewSnapshot): void {
    this.snapshot = snapshot;
  }

  async getPrometheusText(): Promise<string> {
    return this.prometheusText;
  }

  async getOverviewSnapshot(): Promise<MetricsOverviewSnapshot> {
    return this.snapshot;
  }
}
