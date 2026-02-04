import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { GitHubService } from './github.service';
import {
  GitHubApiService,
  GitHubSyncService,
  GitHubDatabaseService,
} from './services';

const mockGitHubApiService = {
  getUserProfile: mock(),
  getUserRepos: mock(),
  getRepoCommitCount: mock(),
  getRepoPullRequests: mock(),
};

const mockGitHubSyncService = {
  syncUserGitHub: mock(),
};

const mockGitHubDatabaseService = {
  saveContributions: mock(),
  saveAchievements: mock(),
};

describe('GitHubService', () => {
  let service: GitHubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubService,
        {
          provide: GitHubApiService,
          useValue: mockGitHubApiService,
        },
        {
          provide: GitHubSyncService,
          useValue: mockGitHubSyncService,
        },
        {
          provide: GitHubDatabaseService,
          useValue: mockGitHubDatabaseService,
        },
      ],
    }).compile();

    service = module.get<GitHubService>(GitHubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserProfile', () => {
    it('should delegate to GitHubApiService', async () => {
      const mockProfile = { login: 'testuser', name: 'Test User' };
      mockGitHubApiService.getUserProfile.mockResolvedValueOnce(mockProfile);

      const profile = await service.getUserProfile('testuser');

      expect(profile).toEqual(mockProfile);
      expect(mockGitHubApiService.getUserProfile).toHaveBeenCalledWith(
        'testuser',
      );
    });

    it('should propagate errors from GitHubApiService', async () => {
      mockGitHubApiService.getUserProfile.mockRejectedValueOnce(
        new HttpException('Not found', 404),
      );

      await expect(
        async () => await service.getUserProfile('nonexistent'),
      ).toThrow(HttpException);
    });
  });

  describe('syncUserGitHub', () => {
    it('should delegate to syncService', async () => {
      const mockResult = {
        success: true,
        stats: {
          totalStars: 160,
          contributionsAdded: 2,
          achievementsAdded: 1,
        },
      };
      mockGitHubSyncService.syncUserGitHub.mockResolvedValue(mockResult);

      const result = await service.syncUserGitHub(
        'user-id',
        'testuser',
        'resume-id',
      );

      expect(result).toEqual(mockResult);
      expect(mockGitHubSyncService.syncUserGitHub).toHaveBeenCalledWith(
        'user-id',
        'testuser',
        'resume-id',
      );
    });
  });
});
