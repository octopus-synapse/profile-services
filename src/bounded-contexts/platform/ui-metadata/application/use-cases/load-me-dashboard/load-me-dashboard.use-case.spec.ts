import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryMeDashboardRepository } from '../../../testing';
import { LoadMeDashboardUseCase } from './load-me-dashboard.use-case';

describe('LoadMeDashboardUseCase', () => {
  let repo: InMemoryMeDashboardRepository;
  let useCase: LoadMeDashboardUseCase;

  beforeEach(() => {
    repo = new InMemoryMeDashboardRepository();
    useCase = new LoadMeDashboardUseCase(repo, stubLogger);
  });

  it('returns the seeded payload for the requested user', async () => {
    repo.setDashboard('u-1', {
      viewer: { id: 'u-1', name: 'Alice', email: 'a@x.dev' },
      counts: {
        resumes: 3,
        applications: 7,
        unreadNotifications: 2,
        followers: 11,
        following: 9,
      },
      recentNotifications: [
        {
          id: 'n-1',
          type: 'POST_LIKED',
          message: 'liked your post',
          messageKey: null,
          messageParams: null,
          read: false,
          createdAt: new Date('2025-01-01T00:00:00Z'),
        },
      ],
      pendingFollowUps: 1,
    });

    const result = await useCase.execute('u-1');

    expect(result.viewer.name).toBe('Alice');
    expect(result.counts.unreadNotifications).toBe(2);
    expect(result.pendingFollowUps).toBe(1);
    expect(result.recentNotifications).toHaveLength(1);
  });

  it('falls back to a stub viewer when the repository says the user is unknown', async () => {
    const result = await useCase.execute('ghost');

    expect(result.viewer).toEqual({ id: 'ghost', name: null, email: null });
    expect(result.counts.resumes).toBe(0);
    expect(result.recentNotifications).toEqual([]);
  });
});
