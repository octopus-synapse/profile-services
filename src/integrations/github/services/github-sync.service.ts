/**
 * GitHub Sync Service
 * Single Responsibility: Orchestrate GitHub sync operations
 */

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { API_LIMITS } from '../../../common/constants/app.constants';
import { GitHubApiService } from './github-api.service';
import { GitHubContributionService } from './github-contribution.service';
import { GitHubAchievementService } from './github-achievement.service';
import { GitHubDatabaseService } from './github-database.service';

@Injectable()
export class GitHubSyncService {
  constructor(
    private readonly apiService: GitHubApiService,
    private readonly contributionService: GitHubContributionService,
    private readonly achievementService: GitHubAchievementService,
    private readonly databaseService: GitHubDatabaseService,
  ) {}

  async syncUserGitHub(
    userId: string,
    githubUsername: string,
    resumeId: string,
  ) {
    await this.databaseService.verifyResumeOwnership(userId, resumeId);

    try {
      const profile = await this.apiService.getUserProfile(githubUsername);
      const repos = await this.apiService.getUserRepos(githubUsername, {
        sort: 'updated',
        per_page: 100,
      });
      const totalStars = repos.reduce(
        (sum, repo) => sum + repo.stargazers_count,
        0,
      );

      await this.databaseService.updateResumeGitHubStats(
        resumeId,
        githubUsername,
        totalStars,
      );

      const contributions = await this.contributionService.processContributions(
        resumeId,
        githubUsername,
        repos.slice(0, API_LIMITS.MAX_REPOS_TO_PROCESS),
      );

      const achievements = this.achievementService.generateAchievements(
        resumeId,
        githubUsername,
        profile,
        totalStars,
      );

      await this.databaseService.reconcileDbEntries(
        resumeId,
        githubUsername,
        contributions,
        achievements,
      );

      return {
        success: true,
        profile: {
          username: profile.login,
          name: profile.name,
          bio: profile.bio,
          publicRepos: profile.public_repos,
        },
        stats: {
          totalStars,
          publicRepos: profile.public_repos,
          contributionsAdded: contributions.length,
          achievementsAdded: achievements.length,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to sync GitHub data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async autoSyncGitHubFromResume(userId: string, resumeId: string) {
    const resume = await this.databaseService.verifyResumeOwnership(
      userId,
      resumeId,
    );

    if (!resume.github) {
      throw new HttpException(
        'No GitHub username found in resume',
        HttpStatus.BAD_REQUEST,
      );
    }

    const githubUsername = this.extractUsername(resume.github);
    return this.syncUserGitHub(userId, githubUsername, resumeId);
  }

  private extractUsername(githubUrl: string): string {
    return githubUrl
      .replace('https://github.com/', '')
      .replace('http://github.com/', '')
      .replace('github.com/', '')
      .split('/')[0];
  }
}
