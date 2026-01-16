/**
 * GitHub Sync Service Tests
 * Focus: Orchestration of GitHub sync operations
 *
 * Key scenarios:
 * - Verify resume ownership before sync
 * - Process repos and generate contributions
 * - Generate achievements based on stats
 * - Handle errors gracefully
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createMockResume } from '../../../../test/factories/resume.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GitHubSyncService } from './github-sync.service';
import { GitHubApiService } from './github-api.service';
import { GitHubContributionService } from './github-contribution.service';
import { GitHubAchievementService } from './github-achievement.service';
import { GitHubDatabaseService } from './github-database.service';

describe('GitHubSyncService', () => {
  let service: GitHubSyncService;
  let fakeApiService: {
    getUserProfile: ReturnType<typeof mock>;
    getUserRepos: ReturnType<typeof mock>;
  };
  let fakeContributionService: {
    processContributions: ReturnType<typeof mock>;
  };
  let fakeAchievementService: {
    generateAchievements: ReturnType<typeof mock>;
  };
  let fakeDatabaseService: {
    verifyResumeOwnership: ReturnType<typeof mock>;
    updateResumeGitHubStats: ReturnType<typeof mock>;
    reconcileDbEntries: ReturnType<typeof mock>;
  };

  const mockProfile = {
    id: 123,
    login: 'testuser',
    name: 'Test User',
    bio: 'A developer',
    public_repos: 25,
    avatar_url: 'https://avatars.githubusercontent.com/u/123',
    html_url: 'https://github.com/testuser',
    followers: 100,
    following: 50,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockRepos = [
    {
      id: 1,
      name: 'repo1',
      stargazers_count: 100,
      owner: { login: 'testuser' },
    },
    {
      id: 2,
      name: 'repo2',
      stargazers_count: 50,
      owner: { login: 'testuser' },
    },
  ];

  const mockResume = createMockResume({ id: 'resume-123', userId: 'user-123', github: 'https://github.com/testuser' });

  beforeEach(async () => {
    fakeApiService = {
      getUserProfile: mock(() => Promise.resolve(mockProfile)),
      getUserRepos: mock(() => Promise.resolve(mockRepos)),
    };

    fakeContributionService = {
      processContributions: mock(() =>
        Promise.resolve([{ projectName: 'test' }]),
      ),
    };

    fakeAchievementService = {
      generateAchievements: mock(() => [{ title: 'Achievement' }]),
    };

    fakeDatabaseService = {
      verifyResumeOwnership: mock(() => Promise.resolve(mockResume)),
      updateResumeGitHubStats: mock(() => Promise.resolve()),
      reconcileDbEntries: mock(() => Promise.resolve()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubSyncService,
        { provide: GitHubApiService, useValue: fakeApiService },
        {
          provide: GitHubContributionService,
          useValue: fakeContributionService,
        },
        { provide: GitHubAchievementService, useValue: fakeAchievementService },
        { provide: GitHubDatabaseService, useValue: fakeDatabaseService },
      ],
    }).compile();

    service = module.get<GitHubSyncService>(GitHubSyncService);
  });

  describe('syncUserGitHub', () => {
    it('should verify resume ownership first', async () => {
      await service.syncUserGitHub('user-123', 'testuser', 'resume-123');

      expect(fakeDatabaseService.verifyResumeOwnership).toHaveBeenCalledWith(
        'user-123',
        'resume-123',
      );
    });

    it('should fetch profile and repos from GitHub API', async () => {
      await service.syncUserGitHub('user-123', 'testuser', 'resume-123');

      expect(fakeApiService.getUserProfile).toHaveBeenCalledWith('testuser');
      expect(fakeApiService.getUserRepos).toHaveBeenCalledWith('testuser', {
        sort: 'updated',
        per_page: 100,
      });
    });

    it('should calculate total stars from all repos', async () => {
      await service.syncUserGitHub('user-123', 'testuser', 'resume-123');

      expect(fakeDatabaseService.updateResumeGitHubStats).toHaveBeenCalledWith(
        'resume-123',
        'testuser',
        150, // 100 + 50 from mockRepos
      );
    });

    it('should return success with profile and stats', async () => {
      const result = await service.syncUserGitHub(
        'user-123',
        'testuser',
        'resume-123',
      );

      expect(result.success).toBe(true);
      expect(result.profile.username).toBe('testuser');
      expect(result.stats.totalStars).toBe(150);
      expect(result.stats.contributionsAdded).toBe(1);
      expect(result.stats.achievementsAdded).toBe(1);
    });

    it('should wrap unknown errors in HttpException', async () => {
      fakeApiService.getUserProfile.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        service.syncUserGitHub('user-123', 'testuser', 'resume-123'),
      ).rejects.toThrow(HttpException);
    });

    it('should rethrow HttpException as-is', async () => {
      const originalError = new HttpException(
        'Not found',
        HttpStatus.NOT_FOUND,
      );
      fakeApiService.getUserProfile.mockRejectedValue(originalError);

      await expect(
        service.syncUserGitHub('user-123', 'testuser', 'resume-123'),
      ).rejects.toThrow('Not found');
    });
  });

  describe('autoSyncGitHubFromResume', () => {
    it('should extract username from GitHub URL', async () => {
      await service.autoSyncGitHubFromResume('user-123', 'resume-123');

      expect(fakeApiService.getUserProfile).toHaveBeenCalledWith('testuser');
    });

    it('should throw when resume has no GitHub username', async () => {
      fakeDatabaseService.verifyResumeOwnership.mockResolvedValue({
        ...mockResume,
        github: null,
      });

      await expect(
        service.autoSyncGitHubFromResume('user-123', 'resume-123'),
      ).rejects.toThrow('No GitHub username found in resume');
    });

    it('should handle various GitHub URL formats', async () => {
      // Test with different URL formats
      const urlFormats = [
        'https://github.com/myuser',
        'http://github.com/myuser',
        'github.com/myuser',
        'myuser',
      ];

      for (const url of urlFormats) {
        fakeApiService.getUserProfile.mockClear();
        fakeDatabaseService.verifyResumeOwnership.mockResolvedValue({
          ...mockResume,
          github: url,
        });

        await service.autoSyncGitHubFromResume('user-123', 'resume-123');

        expect(fakeApiService.getUserProfile).toHaveBeenCalledWith('myuser');
      }
    });
  });
});
