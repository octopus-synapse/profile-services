/**
 * GitHub Service (Refactored)
 * Single Responsibility: Orchestrate GitHub sync operations
 * Delegates to specialized services for API, contributions, and achievements
 */

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ERROR_MESSAGES,
  API_LIMITS,
} from '../../common/constants/app.constants';
import {
  GitHubApiService,
  GitHubContributionService,
  GitHubAchievementService,
} from './services';

@Injectable()
export class GitHubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiService: GitHubApiService,
    private readonly contributionService: GitHubContributionService,
    private readonly achievementService: GitHubAchievementService,
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
    await this.verifyResumeOwnership(userId, resumeId);

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

      await this.updateResumeGitHubStats(resumeId, githubUsername, totalStars);

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

      await this.reconcileDbEntries(
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
    const resume = await this.verifyResumeOwnership(userId, resumeId);

    if (!resume.github) {
      throw new HttpException(
        'No GitHub username found in resume',
        HttpStatus.BAD_REQUEST,
      );
    }

    const githubUsername = this.extractUsername(resume.github);
    return this.syncUserGitHub(userId, githubUsername, resumeId);
  }

  async getSyncStatus(userId: string, resumeId: string) {
    const resume = await this.verifyResumeOwnership(userId, resumeId, {
      openSource: { where: { projectUrl: { contains: 'github.com' } } },
      achievements: { where: { type: 'github_stars' } },
    });

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
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to fetch GitHub summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== Private Helpers ====================

  private async verifyResumeOwnership(
    userId: string,
    resumeId: string,
    include?: Prisma.ResumeInclude,
  ) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include,
    });

    if (!resume) {
      throw new HttpException(
        ERROR_MESSAGES.RESUME_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (resume.userId !== userId) {
      throw new HttpException(
        ERROR_MESSAGES.ACCESS_DENIED,
        HttpStatus.FORBIDDEN,
      );
    }

    return resume;
  }

  private async updateResumeGitHubStats(
    resumeId: string,
    githubUsername: string,
    totalStars: number,
  ) {
    return this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        github: `https://github.com/${githubUsername}`,
        totalStars,
      },
    });
  }

  private async reconcileDbEntries(
    resumeId: string,
    githubUsername: string,
    contributions: Prisma.OpenSourceContributionCreateManyInput[],
    achievements: Prisma.AchievementCreateManyInput[],
  ) {
    return this.prisma.$transaction([
      this.prisma.openSourceContribution.deleteMany({
        where: {
          resumeId,
          projectUrl: { contains: 'github.com' },
        },
      }),
      ...(contributions.length > 0
        ? [
            this.prisma.openSourceContribution.createMany({
              data: contributions,
            }),
          ]
        : []),
      this.prisma.achievement.deleteMany({
        where: {
          resumeId,
          OR: [
            { type: 'github_stars' },
            { verificationUrl: { contains: `github.com/${githubUsername}` } },
          ],
        },
      }),
      ...(achievements.length > 0
        ? [this.prisma.achievement.createMany({ data: achievements })]
        : []),
    ]);
  }

  private extractUsername(githubUrl: string): string {
    return githubUrl
      .replace('https://github.com/', '')
      .replace('http://github.com/', '')
      .replace('github.com/', '')
      .split('/')[0];
  }
}
