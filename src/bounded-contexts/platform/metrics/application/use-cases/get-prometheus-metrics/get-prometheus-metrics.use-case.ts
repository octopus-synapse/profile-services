/**
 * Returns the Prometheus exposition payload for the `/metrics` scrape
 * endpoint. The use case never sees the registry — it asks the
 * `MetricsReaderPort` for the rendered text and forwards it.
 */

import { MetricsReaderPort } from '../../../domain/ports/metrics-reader.port';

export class GetPrometheusMetricsUseCase {
  constructor(private readonly reader: MetricsReaderPort) {}

  execute(): Promise<string> {
    return this.reader.getPrometheusText();
  }
}
