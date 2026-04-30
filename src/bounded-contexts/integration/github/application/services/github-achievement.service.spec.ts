import { describe, expect, it } from 'bun:test';
import type { GitHubUser } from '../../types/github.types';
import { GitHubAchievementService } from './github-achievement.service';

const profile = (publicRepos: number): GitHubUser =>
  ({ login: 'octo', public_repos: publicRepos }) as unknown as GitHubUser;

describe('GitHubAchievementService', () => {
  const service = new GitHubAchievementService();

  it('emits no achievement when both thresholds are below the limit', () => {
    expect(service.generateAchievements('octo', profile(5), 50)).toEqual([]);
  });

  it('emits the stars achievement once total stars cross 100', () => {
    const out = service.generateAchievements('octo', profile(5), 150);
    expect(out).toHaveLength(1);
    expect(out[0]?.type).toBe('github_stars');
  });

  it('emits the repo-count achievement once public repos cross 20', () => {
    const out = service.generateAchievements('octo', profile(25), 0);
    expect(out).toHaveLength(1);
    expect(out[0]?.type).toBe('custom');
  });

  it('emits both achievements when both thresholds are crossed', () => {
    const out = service.generateAchievements('octo', profile(25), 200);
    expect(out).toHaveLength(2);
  });
});
