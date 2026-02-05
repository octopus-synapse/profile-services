/**
 * GitHub Service (Facade)
 * Provides unified API for GitHub operations
 * Delegates to specialized services for implementation
 */

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { API_LIMITS } from '@/shared-kernel';
import {
  GitHubApiService,
  GitHubSyncService,
  GitHubDatabaseService,
} from './services';

@Injectable()
export class GitHubService {
  constructor(
    private readonly apiService: GitHubApiService,
    private readonly syncService: GitHubSyncService,
    private readonly databaseService: GitHubDatabaseService,
  ) {}

  // ==================== Public API Delegation ====================

  async getUserProfile(username: string) {
    return this.apiService.getUserProfile(username);
  }

  async getUserRepos(username: string, options = {}) {
    return this.apiService.getUserRepos(username, options);
  }

  async getTotalStars(username: string): Promise<number> {
    const repos = await this.apiService.getUserRepos(username);
    return repos.reduce((total, repo) => total + repo.stargazers_count, 0);
  }

  // ==================== Sync Operations ====================

  async syncUserGitHub(
    userId: string,
    githubUsername: string,
    resumeId: string,
  ) {
    return this.syncService.syncUserGitHub(userId, githubUsername, resumeId);
  }

  async autoSyncGitHubFromResume(userId: string, resumeId: string) {
    return this.syncService.autoSyncGitHubFromResume(userId, resumeId);
  }

  async getSyncStatus(userId: string, resumeId: string) {
    const resume = await this.databaseService.verifyResumeOwnership(
      userId,
      resumeId,
      {
        openSource: { where: { projectUrl: { contains: 'github.com' } } },
        achievements: { where: { type: 'github_stars' } },
      },
    );

    const openSourceList =
      'openSource' in resume ? (resume.openSource as unknown[]) : [];
    const achievementsList =
      'achievements' in resume ? (resume.achievements as unknown[]) : [];
    const github = (resume as { github?: string | null }).github;

    return {
      hasSynced: openSourceList.length > 0 || achievementsList.length > 0,
      lastSyncedAt: resume.updatedAt,
      githubUsername: github ? this.extractUsername(github) : null,
      stats: {
        totalStars: (resume as { totalStars?: number }).totalStars ?? 0,
        openSourceProjects: openSourceList.length,
        achievements: achievementsList.length,
      },
    };
  }

  async getGitHubSummary(username: string) {
    try {
      const profile = await this.apiService.getUserProfile(username);
      const repos = await this.apiService.getUserRepos(username, {
        per_page: 100,
      });
      const totalStars = repos.reduce(
        (sum, repo) => sum + repo.stargazers_count,
        0,
      );

      const topRepos = repos
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, API_LIMITS.MAX_CONTRIBUTIONS_TO_SHOW)
        .map((repo) => ({
          name: repo.name,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          url: repo.html_url,
        }));

      return {
        username: profile.login,
        name: profile.name,
        bio: profile.bio,
        publicRepos: profile.public_repos,
        totalStars,
        topRepos,
      };
    } catch (error) {
      // Error transformation - see ERROR_HANDLING_STRATEGY.md
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to fetch GitHub summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private extractUsername(githubUrl: string): string {
    return githubUrl
      .replace('https://github.com/', '')
      .replace('http://github.com/', '')
      .replace('github.com/', '')
      .split('/')[0];
  }
}
