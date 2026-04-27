import { describe, expect, it } from 'bun:test';
import { InMemoryGitHubApi } from '../../testing';
import type { GitHubRepo } from '../../types/github.types';
import { GitHubContributionService } from './github-contribution.service';

const repo = (overrides: Partial<GitHubRepo> & { name: string }): GitHubRepo =>
  ({
    description: null,
    stargazers_count: 0,
    forks_count: 0,
    language: null,
    html_url: `https://github.com/octo/${overrides.name}`,
    owner: { login: 'octo' },
    topics: [],
    pushed_at: '2024-01-01',
    created_at: '2020-01-01',
    ...overrides,
  }) as unknown as GitHubRepo;

describe('GitHubContributionService', () => {
  it('skips zero-star repos that the user does not own', async () => {
    const api = new InMemoryGitHubApi();
    const service = new GitHubContributionService(api);
    const result = await service.processContributions('r-1', 'octo', [
      repo({ name: 'someone-elses', stargazers_count: 0, owner: { login: 'other' } as never }),
    ]);
    expect(result).toEqual([]);
  });

  it('classifies the user as maintainer when they own the repo', async () => {
    const api = new InMemoryGitHubApi();
    const service = new GitHubContributionService(api);
    const out = await service.processContributions('r-1', 'octo', [repo({ name: 'mine' })]);
    expect(out[0]?.role).toBe('maintainer');
  });

  it('promotes to core_contributor based on commit/PR counts', async () => {
    const api = new InMemoryGitHubApi();
    api.setCommitCount('upstream/lib', 50);
    const service = new GitHubContributionService(api);
    const out = await service.processContributions('r-1', 'octo', [
      repo({
        name: 'lib',
        stargazers_count: 100,
        owner: { login: 'upstream' } as never,
      }),
    ]);
    expect(out[0]?.role).toBe('core_contributor');
  });
});
