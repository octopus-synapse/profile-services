import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GitHubService } from './github.service';
import {
  GitHubApiService,
  GitHubContributionService,
  GitHubAchievementService,
} from './services';

// Mock services
const mockPrismaService = {
  resume: {
    update: jest.fn(),
    findUnique: jest.fn().mockResolvedValue({
      id: 'resume-id',
      userId: 'user-id',
    }),
  },
  openSourceContribution: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  achievement: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation(async (actions) => {
    for (const action of actions) {
      // Mock transaction execution
    }
    return [];
  }),
};

const mockGitHubApiService = {
  getUserProfile: jest.fn(),
  getUserRepos: jest.fn(),
  getRepoCommitCount: jest.fn(),
  getRepoPullRequests: jest.fn(),
};

const mockGitHubContributionService = {
  processContributions: jest.fn(),
};

const mockGitHubAchievementService = {
  generateAchievements: jest.fn(),
};

describe('GitHubService', () => {
  let service: GitHubService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: GitHubApiService, useValue: mockGitHubApiService },
        {
          provide: GitHubContributionService,
          useValue: mockGitHubContributionService,
        },
        {
          provide: GitHubAchievementService,
          useValue: mockGitHubAchievementService,
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

      await expect(service.getUserProfile('nonexistent')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('syncUserGitHub', () => {
    it('should orchestrate the full sync process', async () => {
      // Arrange
      const mockProfile = {
        login: 'testuser',
        name: 'Test User',
        public_repos: 5,
      };
      const mockRepos = [
        {
          name: 'repo1',
          stargazers_count: 10,
          owner: { login: 'testuser' },
          created_at: new Date().toISOString(),
          pushed_at: new Date().toISOString(),
          html_url: 'url',
          topics: [],
        },
        {
          name: 'repo2',
          stargazers_count: 150,
          owner: { login: 'testuser' },
          created_at: new Date().toISOString(),
          pushed_at: new Date().toISOString(),
          html_url: 'url',
          topics: [],
        },
      ];
      const mockContributions = [
        { repoName: 'repo1', repoUrl: 'url', role: 'owner' },
        { repoName: 'repo2', repoUrl: 'url', role: 'owner' },
      ];
      const mockAchievements = [{ title: '100 Stars', description: 'desc' }];

      mockGitHubApiService.getUserProfile.mockResolvedValueOnce(mockProfile);
      mockGitHubApiService.getUserRepos.mockResolvedValueOnce(mockRepos);
      mockGitHubContributionService.processContributions.mockResolvedValueOnce(
        mockContributions,
      );
      mockGitHubAchievementService.generateAchievements.mockReturnValueOnce(
        mockAchievements,
      );

      // Act
      const result = await service.syncUserGitHub(
        'user-id',
        'testuser',
        'resume-id',
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.stats.totalStars).toBe(160);
      expect(result.stats.contributionsAdded).toBe(2);
      expect(result.stats.achievementsAdded).toBe(1);

      // Verify delegation to sub-services
      expect(mockGitHubApiService.getUserProfile).toHaveBeenCalledWith(
        'testuser',
      );
      expect(mockGitHubApiService.getUserRepos).toHaveBeenCalledWith(
        'testuser',
        expect.any(Object),
      );
      expect(
        mockGitHubContributionService.processContributions,
      ).toHaveBeenCalled();
      expect(
        mockGitHubAchievementService.generateAchievements,
      ).toHaveBeenCalled();

      // Check that the database methods were called
      expect(mockPrismaService.resume.update).toHaveBeenCalled();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
