/**
 * GitHub Contribution Service Tests
 * Focus: Contribution processing rules
 *
 * Key scenarios:
 * - Include repo when has stars or owned by user
 * - Role determination (maintainer/core_contributor/contributor)
 * - Recent activity detection (90 days)
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { GitHubContributionService } from './github-contribution.service';
import { GitHubApiService, GitHubRepo } from './github-api.service';

describe('GitHubContributionService', () => {
  let service: GitHubContributionService;
  let fakeApiService: {
    getRepoCommitCount: ReturnType<typeof mock>;
    getRepoPullRequests: ReturnType<typeof mock>;
  };

  const createRepo = (overrides: Partial<GitHubRepo> = {}): GitHubRepo => ({
    id: 12345,
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    html_url: 'https://github.com/testuser/test-repo',
    description: 'A test repository',
    owner: {
      login: 'testuser',
      id: 1,
      avatar_url: 'https://avatars.githubusercontent.com/u/1',
      html_url: 'https://github.com/testuser',
    },
    stargazers_count: 10,
    forks_count: 5,
    language: 'TypeScript',
    topics: ['testing', 'typescript'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    pushed_at: new Date().toISOString(), // recent
    default_branch: 'main',
    fork: false,
    private: false,
    ...overrides,
  });

  beforeEach(async () => {
    fakeApiService = {
      getRepoCommitCount: mock(() => Promise.resolve(5)),
      getRepoPullRequests: mock(() => Promise.resolve(2)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubContributionService,
        { provide: GitHubApiService, useValue: fakeApiService },
      ],
    }).compile();

    service = module.get<GitHubContributionService>(GitHubContributionService);
  });

  describe('processContributions', () => {
    it('should include repo owned by user even with 0 stars', async () => {
      const repo = createRepo({
        stargazers_count: 0,
        owner: { login: 'testuser', id: 1, avatar_url: '', html_url: '' },
      });

      const result = await service.processContributions(
        'resume-123',
        'testuser',
        [repo],
      );

      expect(result).toHaveLength(1);
      expect(result[0].projectName).toBe('test-repo');
    });

    it('should include repo with stars even if not owned by user', async () => {
      const repo = createRepo({
        stargazers_count: 5,
        owner: { login: 'otheruser', id: 2, avatar_url: '', html_url: '' },
      });

      const result = await service.processContributions(
        'resume-123',
        'testuser',
        [repo],
      );

      expect(result).toHaveLength(1);
    });

    it('should exclude repo with 0 stars not owned by user', async () => {
      const repo = createRepo({
        stargazers_count: 0,
        owner: { login: 'otheruser', id: 2, avatar_url: '', html_url: '' },
      });

      const result = await service.processContributions(
        'resume-123',
        'testuser',
        [repo],
      );

      expect(result).toHaveLength(0);
    });

    it('should determine role as maintainer when user owns repo', async () => {
      const repo = createRepo({
        owner: { login: 'testuser', id: 1, avatar_url: '', html_url: '' },
      });

      const result = await service.processContributions(
        'resume-123',
        'testuser',
        [repo],
      );

      expect(result[0].role).toBe('maintainer');
    });

    it('should determine role as core_contributor with high commits', async () => {
      fakeApiService.getRepoCommitCount.mockResolvedValue(15); // > 10 commits
      fakeApiService.getRepoPullRequests.mockResolvedValue(2);

      const repo = createRepo({
        owner: { login: 'otheruser', id: 2, avatar_url: '', html_url: '' },
      });

      const result = await service.processContributions(
        'resume-123',
        'testuser',
        [repo],
      );

      expect(result[0].role).toBe('core_contributor');
    });

    it('should determine role as core_contributor with high PRs', async () => {
      fakeApiService.getRepoCommitCount.mockResolvedValue(3);
      fakeApiService.getRepoPullRequests.mockResolvedValue(8); // > 5 PRs

      const repo = createRepo({
        owner: { login: 'otheruser', id: 2, avatar_url: '', html_url: '' },
      });

      const result = await service.processContributions(
        'resume-123',
        'testuser',
        [repo],
      );

      expect(result[0].role).toBe('core_contributor');
    });

    it('should determine role as contributor with low activity', async () => {
      fakeApiService.getRepoCommitCount.mockResolvedValue(3);
      fakeApiService.getRepoPullRequests.mockResolvedValue(2);

      const repo = createRepo({
        owner: { login: 'otheruser', id: 2, avatar_url: '', html_url: '' },
      });

      const result = await service.processContributions(
        'resume-123',
        'testuser',
        [repo],
      );

      expect(result[0].role).toBe('contributor');
    });

    it('should mark as current when pushed within 90 days', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago

      const repo = createRepo({
        pushed_at: recentDate.toISOString(),
      });

      const result = await service.processContributions(
        'resume-123',
        'testuser',
        [repo],
      );

      expect(result[0].isCurrent).toBe(true);
    });

    it('should not mark as current when pushed over 90 days ago', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      const repo = createRepo({
        pushed_at: oldDate.toISOString(),
      });

      const result = await service.processContributions(
        'resume-123',
        'testuser',
        [repo],
      );

      expect(result[0].isCurrent).toBe(false);
    });

    it('should use topics as technologies when available', async () => {
      const repo = createRepo({
        topics: ['react', 'typescript', 'testing'],
        language: 'JavaScript',
      });

      const result = await service.processContributions(
        'resume-123',
        'testuser',
        [repo],
      );

      expect(result[0].technologies).toEqual([
        'react',
        'typescript',
        'testing',
      ]);
    });

    it('should fallback to language when no topics', async () => {
      const repo = createRepo({
        topics: [],
        language: 'Python',
      });

      const result = await service.processContributions(
        'resume-123',
        'testuser',
        [repo],
      );

      expect(result[0].technologies).toEqual(['Python']);
    });
  });
});
