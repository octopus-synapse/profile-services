import { describe, expect, it } from 'bun:test';
import { GitHubUsernameMissingException } from '../../../domain/exceptions';
import { InMemoryGitHubApi, InMemoryGitHubResumeRepository } from '../../testing';
import type { GitHubRepo, GitHubUser } from '../../types/github.types';
import { GitHubAchievementService } from './github-achievement.service';
import { GitHubContributionService } from './github-contribution.service';
import { GitHubSyncService } from './github-sync.service';

const profile = (publicRepos: number): GitHubUser =>
  ({ login: 'octo', name: 'Octo', bio: null, public_repos: publicRepos }) as unknown as GitHubUser;

const repo: GitHubRepo = {
  name: 'lib',
  description: null,
  stargazers_count: 0,
  forks_count: 0,
  language: null,
  html_url: 'https://github.com/octo/lib',
  owner: { login: 'octo' },
  topics: [],
  pushed_at: '2024-01-01',
  created_at: '2020-01-01',
} as unknown as GitHubRepo;

function build() {
  const api = new InMemoryGitHubApi();
  const resumes = new InMemoryGitHubResumeRepository();
  const sync = new GitHubSyncService(
    api,
    resumes,
    new GitHubContributionService(api),
    new GitHubAchievementService(),
  );
  return { api, resumes, sync };
}

describe('GitHubSyncService', () => {
  it('persists stats and reconciles section items end-to-end', async () => {
    const { api, resumes, sync } = build();
    resumes.seedResume({ id: 'r-1', userId: 'u-1' });
    api.seedProfile(profile(3));
    api.seedRepos([repo]);

    const result = await sync.syncUserGitHub('u-1', 'octo', 'r-1');

    expect(result.profile.username).toBe('octo');
    expect(resumes.statsUpdates[0]?.totalStars).toBe(0);
    expect(resumes.reconciles).toHaveLength(1);
  });

  it('rejects auto-sync when the resume has no github URL', async () => {
    const { resumes, sync } = build();
    resumes.seedResume({ id: 'r-1', userId: 'u-1', github: null });
    await expect(sync.autoSyncGitHubFromResume('u-1', 'r-1')).rejects.toBeInstanceOf(
      GitHubUsernameMissingException,
    );
  });
});
