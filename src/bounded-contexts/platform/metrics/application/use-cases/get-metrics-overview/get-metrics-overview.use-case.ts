/**
 * Returns the aggregated metrics snapshot used by the admin dashboard.
 * Pure delegation to the reader port.
 */

import {
  type MetricsOverviewSnapshot,
  MetricsReaderPort,
} from '../../../domain/ports/metrics-reader.port';

export class GetMetricsOverviewUseCase {
  constructor(private readonly reader: MetricsReaderPort) {}

  execute(): Promise<MetricsOverviewSnapshot> {
    return this.reader.getOverviewSnapshot();
  }
}
