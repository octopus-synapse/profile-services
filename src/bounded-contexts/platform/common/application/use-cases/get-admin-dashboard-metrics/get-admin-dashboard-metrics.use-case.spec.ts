import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryAdminDashboardRepository } from '../../../testing';
import { GetAdminDashboardMetricsUseCase } from './get-admin-dashboard-metrics.use-case';

describe('GetAdminDashboardMetricsUseCase', () => {
  it('derives onboarding completion rate as a rounded percent', async () => {
    const repo = new InMemoryAdminDashboardRepository({
      totalUsers: 200,
      totalResumes: 50,
      activeUsers7d: 10,
      activeUsers30d: 30,
      totalViews: 0,
      signupsThisWeek: 4,
      signupsThisMonth: 12,
      resumesThisWeek: 2,
      resumesThisMonth: 5,
      onboardingCompleted: 51,
    });

    const result = await new GetAdminDashboardMetricsUseCase(repo, stubLogger).execute();

    expect(result.onboardingCompletionRate).toBe(26);
    expect(result.totalUsers).toBe(200);
    expect(result.averageAtsScore).toBe(0);
  });

  it('returns 0 onboarding rate when there are no users', async () => {
    const repo = new InMemoryAdminDashboardRepository({
      totalUsers: 0,
      totalResumes: 0,
      activeUsers7d: 0,
      activeUsers30d: 0,
      totalViews: 0,
      signupsThisWeek: 0,
      signupsThisMonth: 0,
      resumesThisWeek: 0,
      resumesThisMonth: 0,
      onboardingCompleted: 0,
    });

    const result = await new GetAdminDashboardMetricsUseCase(repo, stubLogger).execute();

    expect(result.onboardingCompletionRate).toBe(0);
  });
});
