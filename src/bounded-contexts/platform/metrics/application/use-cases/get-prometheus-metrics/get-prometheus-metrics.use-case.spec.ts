import { describe, expect, it } from 'bun:test';
import { InMemoryMetricsReader } from '../../../testing';
import { GetPrometheusMetricsUseCase } from './get-prometheus-metrics.use-case';

describe('GetPrometheusMetricsUseCase', () => {
  it('returns whatever Prometheus text the reader produces', async () => {
    const reader = new InMemoryMetricsReader();
    reader.seedPrometheusText('# HELP foo bar\nfoo 1\n');
    const useCase = new GetPrometheusMetricsUseCase(reader);

    const result = await useCase.execute();
    expect(result).toBe('# HELP foo bar\nfoo 1\n');
  });
});
