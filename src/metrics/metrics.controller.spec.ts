import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { MetricsController } from './metrics.controller';
import type { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let mockMetricsService: Partial<MetricsService>;

  beforeEach(() => {
    mockMetricsService = {
      getMetrics: mock(() =>
        Promise.resolve('# HELP test_metric\ntest_metric 1'),
      ),
      getContentType: mock(() => 'text/plain; version=0.0.4; charset=utf-8'),
    };

    controller = new MetricsController(
      mockMetricsService as unknown as MetricsService,
    );
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics', async () => {
      const result = await controller.getMetrics();

      expect(result).toContain('test_metric');
      expect(mockMetricsService.getMetrics).toHaveBeenCalled();
    });
  });
});
