import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryPlatformStatsRepository } from '../../../testing';
import { GetPlatformStatsUseCase } from './get-platform-stats.use-case';

describe('GetPlatformStatsUseCase', () => {
  it('splits totals into privileged and regular cohorts', async () => {
    const repo = new InMemoryPlatformStatsRepository({
      totalUsers: 100,
      totalResumes: 40,
      usersWithOnboarding: 60,
      recentSignups: 5,
      privilegedUserCount: 3,
    });

    const result = await new GetPlatformStatsUseCase(repo, stubLogger).execute();

    expect(result.users.total).toBe(100);
    expect(result.users.privileged).toBe(3);
    expect(result.users.regular).toBe(97);
    expect(result.resumes.total).toBe(40);
  });

  it('handles zero totals without negative regular counts', async () => {
    const repo = new InMemoryPlatformStatsRepository({
      totalUsers: 0,
      totalResumes: 0,
      usersWithOnboarding: 0,
      recentSignups: 0,
      privilegedUserCount: 0,
    });

    const result = await new GetPlatformStatsUseCase(repo, stubLogger).execute();

    expect(result.users.regular).toBe(0);
  });
});
