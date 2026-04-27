import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { GetPrometheusMetricsUseCase } from '../../application/use-cases/get-prometheus-metrics/get-prometheus-metrics.use-case';
import { MetricsController } from './metrics.controller';

describe('MetricsController', () => {
  let controller: MetricsController;
  let executeMock: ReturnType<typeof mock>;

  beforeEach(() => {
    executeMock = mock(() => Promise.resolve('# HELP test_metric\ntest_metric 1'));
    controller = new MetricsController({
      execute: executeMock,
    } as unknown as GetPrometheusMetricsUseCase);
  });

  it('returns the Prometheus text from the use case', async () => {
    const result = await controller.getMetrics();
    expect(result).toContain('test_metric');
    expect(executeMock).toHaveBeenCalled();
  });
});
