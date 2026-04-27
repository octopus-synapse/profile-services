import { describe, expect, it } from 'bun:test';
import { InMemoryGitHubResumeRepository } from '../../../testing';
import { GetGitHubSyncStatusUseCase } from './get-github-sync-status.use-case';

describe('GetGitHubSyncStatusUseCase', () => {
  it('forwards whatever the repository reports', async () => {
    const repo = new InMemoryGitHubResumeRepository();
    repo.syncStatus = {
      hasSynced: true,
      lastSyncedAt: new Date('2026-04-01T00:00:00Z'),
      githubUrl: 'https://github.com/octo',
      stats: { totalStars: 42, openSourceProjects: 3, achievements: 1 },
    };
    const result = await new GetGitHubSyncStatusUseCase(repo).execute('u', 'r');
    expect(result.hasSynced).toBe(true);
    expect(result.stats.totalStars).toBe(42);
  });
});
