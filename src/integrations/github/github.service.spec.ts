import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GitHubService } from './github.service';

// Mock the global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockPrismaService = {
  resume: {
    update: jest.fn(),
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
      // In a real test, you might want to inspect the actions
      // For now, we just mock that they succeed
    }
    return [];
  }),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('mock_github_token'),
};

describe('GitHubService', () => {
  let service: GitHubService;

  beforeEach(async () => {
    mockFetch.mockClear();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GitHubService>(GitHubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserProfile', () => {
    it('should fetch and return a user profile', async () => {
      const mockProfile = { login: 'testuser', name: 'Test User' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      });

      const profile = await service.getUserProfile('testuser');

      expect(profile).toEqual(mockProfile);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/users/testuser',
        expect.any(Object),
      );
    });

    it('should throw HttpException if user not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(service.getUserProfile('nonexistent')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('syncUserGitHub', () => {
    it('should orchestrate the full sync process', async () => {
      // Arrange: Mock all the GitHub API responses
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
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockProfile }) // getUserProfile
        .mockResolvedValueOnce({ ok: true, json: async () => mockRepos }) // getUserRepos
        .mockResolvedValueOnce({ ok: true, json: async () => [{}] }) // getRepoCommitCount for repo1
        .mockResolvedValueOnce({ ok: true, json: async () => [] }) // getRepoPullRequests for repo1
        .mockResolvedValueOnce({ ok: true, json: async () => [{}] }) // getRepoCommitCount for repo2
        .mockResolvedValueOnce({ ok: true, json: async () => [] }); // getRepoPullRequests for repo2

      // Act
      const result = await service.syncUserGitHub(
        'user-id',
        'testuser',
        'resume-id',
      );

      // Assert
      // Check the final result object
      expect(result.success).toBe(true);
      expect(result.stats.totalStars).toBe(160);
      expect(result.stats.contributionsAdded).toBe(2);
      expect(result.stats.achievementsAdded).toBe(1); // Only stars achievement

      // Check that the database methods were called
      expect(mockPrismaService.resume.update).toHaveBeenCalled();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
