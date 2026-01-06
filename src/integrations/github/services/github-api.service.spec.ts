/**
 * GitHubApiService Tests
 *
 * Tests for GitHub API interactions including error scenarios.
 * Kent Beck: "Test the error paths as thoroughly as the happy paths."
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GitHubApiService } from './github-api.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GitHubApiService', () => {
  let service: GitHubApiService;
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockGitHubUser = {
    login: 'testuser',
    id: 12345,
    name: 'Test User',
    bio: 'Developer',
    public_repos: 10,
    followers: 100,
    following: 50,
  };

  const mockGitHubRepos = [
    { id: 1, name: 'repo1', full_name: 'testuser/repo1', stargazers_count: 10 },
    { id: 2, name: 'repo2', full_name: 'testuser/repo2', stargazers_count: 5 },
  ];

  beforeEach(async () => {
    mockFetch.mockReset();

    mockConfigService = {
      get: jest.fn().mockReturnValue('test-github-token'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubApiService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GitHubApiService>(GitHubApiService);
  });

  describe('fetchGitHub', () => {
    it('should fetch data successfully with authorization header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const result = await service.fetchGitHub('/test');

      expect(result).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-github-token',
            Accept: 'application/vnd.github.v3+json',
          }),
        }),
      );
    });

    it('should work without token', async () => {
      mockConfigService.get.mockReturnValue('');

      // Recreate service without token
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GitHubApiService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const serviceNoToken = module.get<GitHubApiService>(GitHubApiService);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await serviceNoToken.fetchGitHub('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/test',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw NOT_FOUND for 404 response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.getUserProfile('nonexistent')).rejects.toThrow(
        new HttpException('GitHub resource not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should throw FORBIDDEN for 403 (rate limit) response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(service.getUserProfile('testuser')).rejects.toThrow(
        new HttpException(
          'GitHub API rate limit exceeded',
          HttpStatus.FORBIDDEN,
        ),
      );
    });

    it('should throw BAD_GATEWAY for other errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.getUserProfile('testuser')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGitHubUser),
      });

      const result = await service.getUserProfile('testuser');

      expect(result).toEqual(mockGitHubUser);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/users/testuser',
        expect.any(Object),
      );
    });
  });

  describe('getUserRepos', () => {
    it('should return user repos with default options', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGitHubRepos),
      });

      const result = await service.getUserRepos('testuser');

      expect(result).toEqual(mockGitHubRepos);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/users/testuser/repos?sort=updated&per_page=100',
        expect.any(Object),
      );
    });

    it('should accept custom options', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGitHubRepos),
      });

      await service.getUserRepos('testuser', { sort: 'pushed', per_page: 50 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/users/testuser/repos?sort=pushed&per_page=50',
        expect.any(Object),
      );
    });
  });

  describe('getRepoCommitCount', () => {
    it('should return commit count', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{}, {}, {}]), // 3 commits
      });

      const result = await service.getRepoCommitCount(
        'owner',
        'repo',
        'testuser',
      );

      expect(result).toBe(3);
    });

    it('should return 0 on error (graceful degradation)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await service.getRepoCommitCount(
        'owner',
        'repo',
        'testuser',
      );

      expect(result).toBe(0);
    });

    it('should return 0 for non-array response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null),
      });

      const result = await service.getRepoCommitCount(
        'owner',
        'repo',
        'testuser',
      );

      expect(result).toBe(0);
    });
  });

  describe('getRepoPullRequests', () => {
    it('should return PR count', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{}, {}]), // 2 PRs
      });

      const result = await service.getRepoPullRequests(
        'owner',
        'repo',
        'testuser',
      );

      expect(result).toBe(2);
    });

    it('should return 0 on error (graceful degradation)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const result = await service.getRepoPullRequests(
        'owner',
        'repo',
        'testuser',
      );

      expect(result).toBe(0);
    });
  });

  describe('getRepoIssues', () => {
    it('should return issue count', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{}, {}, {}, {}]), // 4 issues
      });

      const result = await service.getRepoIssues('owner', 'repo', 'testuser');

      expect(result).toBe(4);
    });

    it('should return 0 on error (graceful degradation)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.getRepoIssues('owner', 'repo', 'testuser');

      expect(result).toBe(0);
    });
  });
});
