import { describe, expect, it } from 'bun:test';
import { InMemoryMetricsReader } from '../../../testing';
import { GetMetricsOverviewUseCase } from './get-metrics-overview.use-case';

describe('GetMetricsOverviewUseCase', () => {
  it('returns the snapshot from the reader', async () => {
    const reader = new InMemoryMetricsReader();
    reader.seedSnapshot({
      counters: { resumeCreated: 7, userSignups: 3, exportCompleted: 2 },
      gauges: { activeUsers: 12, pendingExports: 0 },
      process: { uptimeSeconds: 100, heapUsedMb: 50, heapTotalMb: 80, eventLoopLagMs: 1.2 },
      latency: [{ route: 'GET /x', totalRequests: 5 }],
    });
    const useCase = new GetMetricsOverviewUseCase(reader);

    const overview = await useCase.execute();
    expect(overview.counters.resumeCreated).toBe(7);
    expect(overview.gauges.activeUsers).toBe(12);
    expect(overview.latency[0]?.route).toBe('GET /x');
  });
});
