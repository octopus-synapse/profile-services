/**
 * GitHubApiService Tests
 *
 * Tests for GitHub API interactions including error scenarios.
 * Pure Bun tests - no NestJS testing utilities.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { GitHubRepo, GitHubUser } from '../types/github.types';
import { GitHubApiService } from './github-api.service';

// ============================================================================
// Stub ConfigService
// ============================================================================

class StubConfigService {
  private values: Map<string, string> = new Map();

  setConfigValue(key: string, value: string): void {
    this.values.set(key, value);
  }

  get<T = string>(key: string): T | undefined {
    return this.values.get(key) as T | undefined;
  }
}

// ============================================================================
// Stub Fetch Helper for Test Scenarios
// ============================================================================

interface FetchResponse {
  ok: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<unknown>;
}

function createFetchStub(): {
  fetch: typeof globalThis.fetch;
  setResponse: (response: FetchResponse) => void;
  setRejection: (error: Error) => void;
  getLastCall: () => { url: string; options: RequestInit } | undefined;
} {
  let nextResponse: FetchResponse | null = null;
  let nextError: Error | null = null;
  let lastCall: { url: string; options: RequestInit } | undefined;

  const fakeFetch = async (
    url: string | URL | Request,
    options?: RequestInit,
  ): Promise<Response> => {
    lastCall = { url: url.toString(), options: options ?? {} };

    if (nextError) {
      const error = nextError;
      nextError = null;
      throw error;
    }

    const resp = nextResponse ?? { ok: true, json: () => Promise.resolve({}) };
    nextResponse = null;

    return {
      ok: resp.ok,
      status: resp.status ?? (resp.ok ? 200 : 500),
      statusText: resp.statusText ?? (resp.ok ? 'OK' : 'Error'),
      json: resp.json ?? (() => Promise.resolve({})),
    } as Response;
  };

  return {
    fetch: fakeFetch as typeof globalThis.fetch,
    setResponse: (response: FetchResponse) => {
      nextResponse = response;
    },
    setRejection: (error: Error) => {
      nextError = error;
    },
    getLastCall: () => lastCall,
  };
}

describe('GitHubApiService', () => {
  let service: GitHubApiService;
  let stubConfig: StubConfigService;
  let fetchStub: ReturnType<typeof createFetchStub>;
  let originalFetch: typeof globalThis.fetch;

  const mockGitHubUser: GitHubUser = {
    login: 'testuser',
    name: 'Test User',
    bio: 'Developer',
    public_repos: 10,
    followers: 100,
    following: 50,
    created_at: '2020-01-01T00:00:00Z',
  };

  const mockGitHubRepos: GitHubRepo[] = [
    {
      id: 1,
      name: 'repo1',
      full_name: 'testuser/repo1',
      description: 'Test repo 1',
      html_url: 'https://github.com/testuser/repo1',
      stargazers_count: 10,
      forks_count: 2,
      language: 'TypeScript',
      topics: ['typescript', 'testing'],
      created_at: '2020-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      pushed_at: '2023-06-01T00:00:00Z',
      owner: { login: 'testuser' },
    },
    {
      id: 2,
      name: 'repo2',
      full_name: 'testuser/repo2',
      description: 'Test repo 2',
      html_url: 'https://github.com/testuser/repo2',
      stargazers_count: 5,
      forks_count: 1,
      language: 'JavaScript',
      topics: ['javascript'],
      created_at: '2021-01-01T00:00:00Z',
      updated_at: '2023-02-01T00:00:00Z',
      pushed_at: '2023-05-01T00:00:00Z',
      owner: { login: 'testuser' },
    },
  ];

  beforeEach(() => {
    // Save original fetch
    originalFetch = globalThis.fetch;

    // Create stub and replace global fetch
    fetchStub = createFetchStub();
    globalThis.fetch = fetchStub.fetch;

    // Create stub config with default token
    stubConfig = new StubConfigService();
    stubConfig.setConfigValue('GITHUB_TOKEN', 'test-github-token');

    // Instantiate service directly (no NestJS)
    service = new GitHubApiService(stubConfig as unknown as ConfigService);
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  });

  describe('fetchGitHub', () => {
    it('should fetch data successfully with authorization header', async () => {
      fetchStub.setResponse({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const result = await service.fetchGitHub('/test');

      expect(result).toEqual({ data: 'test' });
      const call = fetchStub.getLastCall();
      expect(call?.url).toBe('https://api.github.com/test');
      expect(call?.options.headers).toMatchObject({
        Authorization: 'Bearer test-github-token',
        Accept: 'application/vnd.github.v3+json',
      });
    });

    it('should work without token', async () => {
      // Create service without token
      const noTokenConfig = new StubConfigService();
      const serviceNoToken = new GitHubApiService(noTokenConfig as unknown as ConfigService);

      fetchStub.setResponse({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await serviceNoToken.fetchGitHub('/test');

      const call = fetchStub.getLastCall();
      const headers = call?.options.headers as Record<string, string>;
      expect(headers?.Authorization).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw NOT_FOUND for 404 response', async () => {
      fetchStub.setResponse({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.getUserProfile('nonexistent')).rejects.toMatchObject({
        response: { statusCode: HttpStatus.NOT_FOUND },
      });
    });

    it('should throw FORBIDDEN for 403 (rate limit) response', async () => {
      fetchStub.setResponse({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(service.getUserProfile('testuser')).rejects.toMatchObject({
        response: { statusCode: HttpStatus.FORBIDDEN },
      });
    });

    it('should throw BAD_GATEWAY for other errors', async () => {
      fetchStub.setResponse({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.getUserProfile('testuser')).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile', async () => {
      fetchStub.setResponse({
        ok: true,
        json: () => Promise.resolve(mockGitHubUser),
      });

      const result = await service.getUserProfile('testuser');

      expect(result).toEqual(mockGitHubUser);
      expect(fetchStub.getLastCall()?.url).toBe('https://api.github.com/users/testuser');
    });
  });

  describe('getUserRepos', () => {
    it('should return user repos with default options', async () => {
      fetchStub.setResponse({
        ok: true,
        json: () => Promise.resolve(mockGitHubRepos),
      });

      const result = await service.getUserRepos('testuser');

      expect(result).toEqual(mockGitHubRepos);
      expect(fetchStub.getLastCall()?.url).toBe(
        'https://api.github.com/users/testuser/repos?sort=updated&per_page=100',
      );
    });

    it('should accept custom options', async () => {
      fetchStub.setResponse({
        ok: true,
        json: () => Promise.resolve(mockGitHubRepos),
      });

      await service.getUserRepos('testuser', { sort: 'pushed', per_page: 50 });

      expect(fetchStub.getLastCall()?.url).toBe(
        'https://api.github.com/users/testuser/repos?sort=pushed&per_page=50',
      );
    });
  });

  describe('getRepoCommitCount', () => {
    it('should return commit count', async () => {
      fetchStub.setResponse({
        ok: true,
        json: () => Promise.resolve([{}, {}, {}]), // 3 commits
      });

      const result = await service.getRepoCommitCount('owner', 'repo', 'testuser');

      expect(result).toBe(3);
    });

    it('should return 0 on error (graceful degradation)', async () => {
      fetchStub.setResponse({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await service.getRepoCommitCount('owner', 'repo', 'testuser');

      expect(result).toBe(0);
    });

    it('should return 0 for non-array response', async () => {
      fetchStub.setResponse({
        ok: true,
        json: () => Promise.resolve(null),
      });

      const result = await service.getRepoCommitCount('owner', 'repo', 'testuser');

      expect(result).toBe(0);
    });
  });

  describe('getRepoPullRequests', () => {
    it('should return PR count', async () => {
      fetchStub.setResponse({
        ok: true,
        json: () => Promise.resolve([{}, {}]), // 2 PRs
      });

      const result = await service.getRepoPullRequests('owner', 'repo', 'testuser');

      expect(result).toBe(2);
    });

    it('should return 0 on error (graceful degradation)', async () => {
      fetchStub.setResponse({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const result = await service.getRepoPullRequests('owner', 'repo', 'testuser');

      expect(result).toBe(0);
    });
  });

  describe('getRepoIssues', () => {
    it('should return issue count', async () => {
      fetchStub.setResponse({
        ok: true,
        json: () => Promise.resolve([{}, {}, {}, {}]), // 4 issues
      });

      const result = await service.getRepoIssues('owner', 'repo', 'testuser');

      expect(result).toBe(4);
    });

    it('should return 0 on error (graceful degradation)', async () => {
      fetchStub.setRejection(new Error('Network error'));

      const result = await service.getRepoIssues('owner', 'repo', 'testuser');

      expect(result).toBe(0);
    });
  });
});
