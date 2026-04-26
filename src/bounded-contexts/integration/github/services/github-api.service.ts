/**
 * GitHub API Service
 * Single Responsibility: Raw API calls to GitHub's REST API
 */

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerPort } from '@/shared-kernel';
import type { GitHubFetchOptions, GitHubRepo, GitHubUser } from '../types/github.types';

const CTX = 'GitHubApiService';

@Injectable()
export class GitHubApiService {
  private readonly apiUrl = 'https://api.github.com';
  private readonly githubToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerPort,
  ) {
    this.githubToken = this.configService.get<string>('GITHUB_TOKEN') ?? '';
  }

  async fetchGitHub<T>(endpoint: string): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };

    if (this.githubToken) {
      headers.Authorization = `Bearer ${this.githubToken}`;
    }

    const response = await fetch(`${this.apiUrl}${endpoint}`, { headers });

    if (!response.ok) {
      this.handleApiError(response);
    }

    return response.json() as Promise<T>;
  }

  async getUserProfile(username: string): Promise<GitHubUser> {
    return this.fetchGitHub<GitHubUser>(`/users/${username}`);
  }

  async getUserRepos(username: string, options: GitHubFetchOptions = {}): Promise<GitHubRepo[]> {
    const sort = options.sort ?? 'updated';
    const perPage = options.per_page ?? 100;
    return this.fetchGitHub<GitHubRepo[]>(
      `/users/${username}/repos?sort=${sort}&per_page=${perPage}`,
    );
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

  /** Per-repo activity counts are best-effort enrichment — a private repo
   *  or rate-limit must not break the whole import. We degrade to 0 but
   *  emit a warn so the failure isn't invisible to ops. */
  private async countOptional(endpoint: string, kind: string): Promise<number> {
    try {
      const items = await this.fetchGitHub<unknown[]>(endpoint);
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
      throw this.createHttpException(
        HttpStatus.NOT_FOUND,
        'GitHub resource not found',
        'Not Found',
      );
    }
    if (response.status === 403) {
      throw this.createHttpException(
        HttpStatus.FORBIDDEN,
        'GitHub API rate limit exceeded',
        'Forbidden',
      );
    }
    throw this.createHttpException(
      HttpStatus.BAD_GATEWAY,
      `Failed to fetch from GitHub: ${response.statusText}`,
      'Bad Gateway',
    );
  }

  private createHttpException(status: HttpStatus, message: string, error: string): HttpException {
    const exceptionResponse = { statusCode: status, message, error };
    const exception = new HttpException(exceptionResponse, status);

    Object.defineProperty(exception, 'response', {
      value: exceptionResponse,
      enumerable: true,
      configurable: true,
      writable: false,
    });

    return exception;
  }
}
