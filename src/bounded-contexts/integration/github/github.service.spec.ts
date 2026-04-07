/**
 * GitHubService Tests (Facade)
 *
 * Tests for the GitHub facade that coordinates multiple services.
 * Pure Bun tests with typed stubs.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GitHubService } from './github.service';
import type { GitHubApiService } from './services/github-api.service';
import type { GitHubDatabaseService } from './services/github-database.service';
import type { GitHubSyncResult, GitHubSyncService } from './services/github-sync.service';
import type { GitHubRepo, GitHubUser } from './types/github.types';

// ============================================================================
// Stub Services
// ============================================================================

class StubGitHubApiService {
  private userProfile: GitHubUser | null = null;
  private userRepos: GitHubRepo[] = [];
  private errorToThrow: Error | null = null;

  setUserProfile(profile: GitHubUser): void {
    this.userProfile = profile;
  }

  setUserRepos(repos: GitHubRepo[]): void {
    this.userRepos = repos;
  }

  setError(error: Error): void {
    this.errorToThrow = error;
  }

  async getUserProfile(_username: string): Promise<GitHubUser> {
    if (this.errorToThrow) {
      const error = this.errorToThrow;
      this.errorToThrow = null;
      throw error;
    }
    if (!this.userProfile) {
      throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    }
    return this.userProfile;
  }

  async getUserRepos(_username: string, _options?: Record<string, unknown>): Promise<GitHubRepo[]> {
    return this.userRepos;
  }
}

class StubGitHubSyncService {
  calls: Array<{ method: string; args: unknown[] }> = [];
  private syncResult: GitHubSyncResult = {
    profile: { username: '', name: null, bio: null, publicRepos: 0 },
    stats: {
      totalStars: 0,
      publicRepos: 0,
      contributionsAdded: 0,
      achievementsAdded: 0,
    },
  };

  setSyncResult(result: GitHubSyncResult): void {
    this.syncResult = result;
  }

  async syncUserGitHub(
    userId: string,
    githubUsername: string,
    resumeId: string,
  ): Promise<GitHubSyncResult> {
    this.calls.push({
      method: 'syncUserGitHub',
      args: [userId, githubUsername, resumeId],
    });
    return this.syncResult;
  }

  getLastCall(method: string) {
    return this.calls.filter((c) => c.method === method).pop();
  }
}

class StubGitHubDatabaseService {
  // Minimal stub - not used in current tests
}

describe('GitHubService', () => {
  let service: GitHubService;
  let stubApiService: StubGitHubApiService;
  let stubSyncService: StubGitHubSyncService;
  let stubDatabaseService: StubGitHubDatabaseService;

  const mockProfile: GitHubUser = {
    login: 'testuser',
    name: 'Test User',
    bio: 'A developer',
    public_repos: 10,
    followers: 100,
    following: 50,
    created_at: '2020-01-01',
  };

  const mockRepos: GitHubRepo[] = [
    {
      id: 1,
      name: 'repo1',
      full_name: 'testuser/repo1',
      description: 'Test repo 1',
      html_url: 'https://github.com/testuser/repo1',
      stargazers_count: 100,
      forks_count: 10,
      language: 'TypeScript',
      topics: ['testing'],
      created_at: '2023-01-01',
      updated_at: '2024-01-01',
      pushed_at: '2024-01-01',
      owner: { login: 'testuser' },
    },
    {
      id: 2,
      name: 'repo2',
      full_name: 'testuser/repo2',
      description: 'Test repo 2',
      html_url: 'https://github.com/testuser/repo2',
      stargazers_count: 60,
      forks_count: 5,
      language: 'JavaScript',
      topics: [],
      created_at: '2023-06-01',
      updated_at: '2024-01-01',
      pushed_at: '2024-01-01',
      owner: { login: 'testuser' },
    },
  ];

  beforeEach(() => {
    stubApiService = new StubGitHubApiService();
    stubSyncService = new StubGitHubSyncService();
    stubDatabaseService = new StubGitHubDatabaseService();

    service = new GitHubService(
      stubApiService as unknown as GitHubApiService,
      stubSyncService as unknown as GitHubSyncService,
      stubDatabaseService as unknown as GitHubDatabaseService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserProfile', () => {
    it('should delegate to GitHubApiService', async () => {
      stubApiService.setUserProfile(mockProfile);

      const profile = await service.getUserProfile('testuser');

      expect(profile).toEqual(mockProfile);
    });

    it('should propagate errors from GitHubApiService', async () => {
      stubApiService.setError(new HttpException('Not found', HttpStatus.NOT_FOUND));

      await expect(service.getUserProfile('nonexistent')).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('getTotalStars', () => {
    it('should calculate total stars from all repos', async () => {
      stubApiService.setUserRepos(mockRepos);

      const totalStars = await service.getTotalStars('testuser');

      expect(totalStars).toBe(160); // 100 + 60
    });

    it('should return 0 when no repos', async () => {
      stubApiService.setUserRepos([]);

      const totalStars = await service.getTotalStars('testuser');

      expect(totalStars).toBe(0);
    });
  });

  describe('syncUserGitHub', () => {
    it('should delegate to syncService', async () => {
      const expectedResult = {
        profile: {
          username: 'testuser',
          name: 'Test User',
          bio: 'Developer',
          publicRepos: 10,
        },
        stats: {
          totalStars: 160,
          publicRepos: 10,
          contributionsAdded: 2,
          achievementsAdded: 1,
        },
      };
      stubSyncService.setSyncResult(expectedResult);

      const result = await service.syncUserGitHub('user-id', 'testuser', 'resume-id');

      expect(result).toEqual(expectedResult);
      expect(stubSyncService.getLastCall('syncUserGitHub')?.args).toEqual([
        'user-id',
        'testuser',
        'resume-id',
      ]);
    });
  });
});
