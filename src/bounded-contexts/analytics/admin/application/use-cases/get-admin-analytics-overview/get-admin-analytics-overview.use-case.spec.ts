import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryAdminAnalyticsRepository } from '../../../testing';
import { GetAdminAnalyticsOverviewUseCase } from './get-admin-analytics-overview.use-case';

describe('GetAdminAnalyticsOverviewUseCase', () => {
  let repo: InMemoryAdminAnalyticsRepository;
  let useCase: GetAdminAnalyticsOverviewUseCase;

  beforeEach(() => {
    repo = new InMemoryAdminAnalyticsRepository();
    useCase = new GetAdminAnalyticsOverviewUseCase(repo);
  });

  it('defaults to weekly user growth and assembles all ten metrics', async () => {
    repo.seed({
      userGrowth: { week: [{ date: '2026-04-20T00:00:00.000Z', count: 5 }] },
      activeUsers: { dau: 10, mau: 100 },
      contentStats: { posts: 1, comments: 2, reactions: 3 },
    });

    const overview = await useCase.execute();

    expect(overview.userGrowth).toEqual([{ date: '2026-04-20T00:00:00.000Z', count: 5 }]);
    expect(overview.activeUsers).toEqual({ dau: 10, mau: 100 });
    expect(overview.contentStats).toEqual({ posts: 1, comments: 2, reactions: 3 });
    // Untouched metrics fall back to empty defaults
    expect(overview.resumesByLanguage).toEqual([]);
    expect(overview.atsScoreDistribution).toEqual([]);
    expect(overview.jobStats.applicationsPerJob).toBe(0);
  });

  it('uses the requested period when fetching user growth', async () => {
    repo.seed({
      userGrowth: {
        day: [{ date: '2026-04-26T00:00:00.000Z', count: 1 }],
        month: [{ date: '2026-04-01T00:00:00.000Z', count: 50 }],
      },
    });

    const daily = await useCase.execute('day');
    expect(daily.userGrowth).toEqual([{ date: '2026-04-26T00:00:00.000Z', count: 1 }]);

    const monthly = await useCase.execute('month');
    expect(monthly.userGrowth).toEqual([{ date: '2026-04-01T00:00:00.000Z', count: 50 }]);
  });
});
