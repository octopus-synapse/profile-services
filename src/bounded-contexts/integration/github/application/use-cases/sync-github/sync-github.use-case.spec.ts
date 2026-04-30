import { describe, expect, it } from 'bun:test';
import { InMemoryGitHubApi, InMemoryGitHubResumeRepository } from '../../../testing';
import type { GitHubRepo, GitHubUser } from '../../../types/github.types';
import { GitHubAchievementService } from '../../services/github-achievement.service';
import { GitHubContributionService } from '../../services/github-contribution.service';
import { GitHubSyncService } from '../../services/github-sync.service';
import { SyncGitHubUseCase } from './sync-github.use-case';

const profile = (overrides: Partial<GitHubUser> = {}): GitHubUser =>
  ({
    login: 'octo',
    name: 'Octo',
    bio: 'Bio',
    public_repos: 5,
    followers: 0,
    following: 0,
    ...overrides,
  }) as unknown as GitHubUser;

const repo = (name: string, stars: number): GitHubRepo =>
  ({
    name,
    description: null,
    stargazers_count: stars,
    forks_count: 0,
    language: null,
    html_url: `https://github.com/octo/${name}`,
    owner: { login: 'octo' },
    topics: [],
    pushed_at: '2024-01-01',
    created_at: '2020-01-01',
  }) as unknown as GitHubRepo;

describe('SyncGitHubUseCase', () => {
  it('persists stats + reconciles section items', async () => {
    const api = new InMemoryGitHubApi();
    const resumes = new InMemoryGitHubResumeRepository();
    resumes.seedResume({ id: 'r-1', userId: 'u-1' });
    api.seedProfile(profile({ public_repos: 3 }));
    api.seedRepos([repo('alpha', 2), repo('beta', 0)]);

    const sync = new GitHubSyncService(
      api,
      resumes,
      new GitHubContributionService(api),
      new GitHubAchievementService(),
    );
    const result = await new SyncGitHubUseCase(sync).execute('u-1', 'octo', 'r-1');

    expect(result.profile.username).toBe('octo');
    expect(resumes.statsUpdates).toHaveLength(1);
    expect(resumes.reconciles).toHaveLength(1);
  });
});
