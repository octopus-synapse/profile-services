/**
 * REST-API implementation of `GitHubApiPort`. Authenticates with the
 * `GITHUB_TOKEN` env var when available; falls back to anonymous calls
 * (subject to the lower rate-limit budget). Maps 404/403/other to
 * `HttpException`s the controller layer can serialize.
 *
 * Per-repo `count*` calls degrade to 0 + a warn log on failure so a
 * private repo or rate limit doesn't take down the whole sync.
 */

import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerPort } from '@/shared-kernel';
import { GitHubApiPort } from '../../../domain/ports/github-api.port';
import type { GitHubFetchOptions, GitHubRepo, GitHubUser } from '../../../types/github.types';

const CTX = 'OctokitGitHubApiAdapter';
const API_URL = 'https://api.github.com';

export class OctokitGitHubApiAdapter extends GitHubApiPort {
  private readonly githubToken: string;

  constructor(
    config: ConfigService,
    private readonly logger: LoggerPort,
  ) {
    super();
    this.githubToken = config.get<string>('GITHUB_TOKEN') ?? '';
  }

  async getUserProfile(username: string): Promise<GitHubUser> {
    return this.fetch<GitHubUser>(`/users/${username}`);
  }

  async getUserRepos(username: string, options: GitHubFetchOptions = {}): Promise<GitHubRepo[]> {
    const sort = options.sort ?? 'updated';
    const perPage = options.per_page ?? 100;
    return this.fetch<GitHubRepo[]>(`/users/${username}/repos?sort=${sort}&per_page=${perPage}`);
  }

  async getRepoCommitCount(owner: string, repo: string, username: string): Promise<number> {
    return this.countOptional(
      `/repos/${owner}/${repo}/commits?author=${username}&per_page=100`,
      'commits',
    );
  }

  async getRepoPullRequests(owner: string, repo: string, username: string): Promise<number> {
    return this.countOptional(
      `/repos/${owner}/${repo}/pulls?creator=${username}&state=all&per_page=100`,
      'pulls',
    );
  }

  async getRepoIssues(owner: string, repo: string, username: string): Promise<number> {
    return this.countOptional(
      `/repos/${owner}/${repo}/issues?creator=${username}&state=all&per_page=100`,
      'issues',
    );
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
    if (this.githubToken) headers.Authorization = `Bearer ${this.githubToken}`;

    const response = await fetch(`${API_URL}${endpoint}`, { headers });
    if (!response.ok) this.handleApiError(response);
    return response.json() as Promise<T>;
  }

  private async countOptional(endpoint: string, kind: string): Promise<number> {
    try {
      const items = await this.fetch<unknown[]>(endpoint);
      return Array.isArray(items) ? items.length : 0;
    } catch (err) {
      this.logger.warn(
        `GitHub ${kind} count failed for ${endpoint}: ${err instanceof Error ? err.message : 'unknown'}`,
        CTX,
      );
      return 0;
    }
  }

  private handleApiError(response: Response): never {
    if (response.status === 404) {
      throw this.httpException(HttpStatus.NOT_FOUND, 'GitHub resource not found', 'Not Found');
    }
    if (response.status === 403) {
      throw this.httpException(HttpStatus.FORBIDDEN, 'GitHub API rate limit exceeded', 'Forbidden');
    }
    throw this.httpException(
      HttpStatus.BAD_GATEWAY,
      `Failed to fetch from GitHub: ${response.statusText}`,
      'Bad Gateway',
    );
  }

  private httpException(status: HttpStatus, message: string, error: string): HttpException {
    const payload = { statusCode: status, message, error };
    const ex = new HttpException(payload, status);
    Object.defineProperty(ex, 'response', {
      value: payload,
      enumerable: true,
      configurable: true,
      writable: false,
    });
    return ex;
  }
}
