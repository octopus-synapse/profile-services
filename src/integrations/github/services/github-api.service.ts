/**
 * GitHub API Service
 * Single Responsibility: Raw API calls to GitHub's REST API
 */

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GitHubUser,
  GitHubRepo,
  GitHubFetchOptions,
} from '../types/github.types';

// Re-export types for backward compatibility
export { GitHubUser, GitHubRepo };

@Injectable()
export class GitHubApiService {
  private readonly apiUrl = 'https://api.github.com';
  private readonly githubToken: string;

  constructor(private readonly configService: ConfigService) {
    this.githubToken = this.configService.get<string>('GITHUB_TOKEN') ?? '';
  }

  async fetchGitHub<T>(endpoint: string): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (this.githubToken) {
      headers['Authorization'] = `Bearer ${this.githubToken}`;
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

  async getUserRepos(
    username: string,
    options: GitHubFetchOptions = {},
  ): Promise<GitHubRepo[]> {
    const sort = options.sort ?? 'updated';
    const perPage = options.per_page ?? 100;
    return this.fetchGitHub<GitHubRepo[]>(
      `/users/${username}/repos?sort=${sort}&per_page=${perPage}`,
    );
  }

  async getRepoCommitCount(
    owner: string,
    repo: string,
    username: string,
  ): Promise<number> {
    try {
      const commits = await this.fetchGitHub<unknown[]>(
        `/repos/${owner}/${repo}/commits?author=${username}&per_page=100`,
      );
      return Array.isArray(commits) ? commits.length : 0;
    } catch {
      return 0;
    }
  }

  async getRepoPullRequests(
    owner: string,
    repo: string,
    username: string,
  ): Promise<number> {
    try {
      const prs = await this.fetchGitHub<unknown[]>(
        `/repos/${owner}/${repo}/pulls?creator=${username}&state=all&per_page=100`,
      );
      return Array.isArray(prs) ? prs.length : 0;
    } catch {
      return 0;
    }
  }

  async getRepoIssues(
    owner: string,
    repo: string,
    username: string,
  ): Promise<number> {
    try {
      const issues = await this.fetchGitHub<unknown[]>(
        `/repos/${owner}/${repo}/issues?creator=${username}&state=all&per_page=100`,
      );
      return Array.isArray(issues) ? issues.length : 0;
    } catch {
      return 0;
    }
  }

  private handleApiError(response: Response): never {
    if (response.status === 404) {
      throw new HttpException(
        'GitHub resource not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (response.status === 403) {
      throw new HttpException(
        'GitHub API rate limit exceeded',
        HttpStatus.FORBIDDEN,
      );
    }
    throw new HttpException(
      `Failed to fetch from GitHub: ${response.statusText}`,
      HttpStatus.BAD_GATEWAY,
    );
  }
}
