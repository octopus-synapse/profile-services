import { describe, expect, it } from 'bun:test';
import { InMemoryGitHubApi } from '../../../testing';
import type { GitHubRepo, GitHubUser } from '../../../types/github.types';
import { GetGitHubSummaryUseCase } from './get-github-summary.use-case';

const profile: GitHubUser = {
  login: 'octo',
  name: 'Octo',
  bio: 'Coder',
  avatar_url: '',
  html_url: '',
  blog: null,
  company: null,
  location: null,
  email: null,
  public_repos: 3,
  followers: 0,
  following: 0,
  created_at: '',
  updated_at: '',
} as unknown as GitHubUser;

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

describe('GetGitHubSummaryUseCase', () => {
  it('aggregates total stars and orders top repos by stars desc', async () => {
    const api = new InMemoryGitHubApi();
    api.seedProfile(profile);
    api.seedRepos([repo('a', 5), repo('b', 100), repo('c', 1)]);

    const result = await new GetGitHubSummaryUseCase(api).execute('octo');

    expect(result.username).toBe('octo');
    expect(result.totalStars).toBe(106);
    expect(result.topRepos[0]?.name).toBe('b');
  });
});
