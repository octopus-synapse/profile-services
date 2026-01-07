/**
 * GitHub Sync Rate Limit Bug Detection Tests
 *
 * Uncle Bob (sem café): "O usuário pode fazer sync INFINITO por dia!
 * A regra de 10 syncs por dia? IGNORADA COMPLETAMENTE!"
 *
 * BUG-008: No GitHub Sync Daily Limit (10 per day)
 * BUG-018: No GitHub Account Uniqueness Check
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  UnprocessableEntityException,
  ConflictException,
} from '@nestjs/common';
import { GitHubSyncService } from './github-sync.service';
import { GitHubApiService } from './github-api.service';
import { GitHubContributionService } from './github-contribution.service';
import { GitHubAchievementService } from './github-achievement.service';
import { GitHubDatabaseService } from './github-database.service';

const MAX_DAILY_SYNCS = 10;

describe('GitHubSyncService - RATE LIMIT BUG DETECTION', () => {
  let service: GitHubSyncService;
  let mockApiService: any;
  let mockContributionService: any;
  let mockAchievementService: any;
  let mockDatabaseService: any;

  const mockProfile = {
    login: 'testuser',
    name: 'Test User',
    bio: 'Developer',
    public_repos: 10,
  };

  const mockRepos = [
    { name: 'repo1', stargazers_count: 5 },
    { name: 'repo2', stargazers_count: 10 },
  ];

  beforeEach(async () => {
    mockApiService = {
      getUserProfile: mock().mockResolvedValue(mockProfile),
      getUserRepos: mock().mockResolvedValue(mockRepos),
    };

    mockContributionService = {
      processContributions: mock().mockResolvedValue([]),
    };

    mockAchievementService = {
      generateAchievements: mock().mockReturnValue([]),
    };

    mockDatabaseService = {
      verifyResumeOwnership: jest
        .fn()
        .mockResolvedValue({ github: 'testuser' }),
      updateResumeGitHubStats: mock().mockResolvedValue(undefined),
      reconcileDbEntries: mock().mockResolvedValue(undefined),
      getSyncCountToday: mock().mockResolvedValue(0),
      recordSync: mock().mockResolvedValue(undefined),
      isGitHubAccountLinked: mock().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubSyncService,
        { provide: GitHubApiService, useValue: mockApiService },
        {
          provide: GitHubContributionService,
          useValue: mockContributionService,
        },
        { provide: GitHubAchievementService, useValue: mockAchievementService },
        { provide: GitHubDatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<GitHubSyncService>(GitHubSyncService);
  });

  describe('BUG-008: Daily Sync Limit (10 per day)', () => {
    /**
     * CRITICAL BUG: No daily sync limit!
     *
     * Business Rule: "Existe limite (ex: 10 syncs por dia)."
     *
     * Expected: Should reject after 10 syncs
     * Actual: Allows unlimited syncs
     */
    it('should REJECT sync when daily limit reached', async () => {
      // User has already done 10 syncs today
      mockDatabaseService.getSyncCountToday.mockResolvedValue(10);

      // BUG: This should throw but doesn't!
      await expect(
        service.syncUserGitHub('user-123', 'testuser', 'resume-123'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should ALLOW sync when under daily limit', async () => {
      mockDatabaseService.getSyncCountToday.mockResolvedValue(5);

      const result = await service.syncUserGitHub(
        'user-123',
        'testuser',
        'resume-123',
      );

      expect(result.success).toBe(true);
    });

    it('should check sync count before processing', async () => {
      mockDatabaseService.getSyncCountToday.mockResolvedValue(0);

      await service.syncUserGitHub('user-123', 'testuser', 'resume-123');

      // BUG: getSyncCountToday is never called!
      expect(mockDatabaseService.getSyncCountToday).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should record sync after successful completion', async () => {
      mockDatabaseService.getSyncCountToday.mockResolvedValue(0);

      await service.syncUserGitHub('user-123', 'testuser', 'resume-123');

      // BUG: recordSync is never called!
      expect(mockDatabaseService.recordSync).toHaveBeenCalledWith('user-123');
    });

    it('should return remaining syncs in response', async () => {
      mockDatabaseService.getSyncCountToday.mockResolvedValue(7);

      const result = await service.syncUserGitHub(
        'user-123',
        'testuser',
        'resume-123',
      );

      // BUG: Response doesn't include rate limit info!
      // Expected: result.rateLimit = { used: 8, limit: 10, remaining: 2 }
      // Actual: No rateLimit property exists
      expect(result.success).toBe(true);
      // This test documents the missing feature
    });
  });

  describe('BUG-018: GitHub Account Uniqueness', () => {
    /**
     * BUG: Same GitHub account can be linked to multiple users!
     *
     * Business Rule: "Cada conta GitHub só pode estar vinculada
     * a um usuário no sistema."
     *
     * Expected: Should reject if GitHub account already linked
     * Actual: No uniqueness check
     */
    it('should REJECT sync if GitHub account linked to another user', async () => {
      // GitHub account 'testuser' is already linked to another user
      mockDatabaseService.isGitHubAccountLinked.mockResolvedValue(true);

      // BUG: This should throw ConflictException!
      await expect(
        service.syncUserGitHub('user-123', 'testuser', 'resume-123'),
      ).rejects.toThrow(ConflictException);
    });

    it('should check GitHub account uniqueness before sync', async () => {
      mockDatabaseService.isGitHubAccountLinked.mockResolvedValue(false);

      await service.syncUserGitHub('user-123', 'testuser', 'resume-123');

      // BUG: isGitHubAccountLinked is never called!
      expect(mockDatabaseService.isGitHubAccountLinked).toHaveBeenCalledWith(
        'testuser',
        'user-123', // Exclude current user from check
      );
    });
  });
});
