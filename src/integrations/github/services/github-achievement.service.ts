/**
 * GitHub Achievement Service
 * Single Responsibility: Generate achievements based on GitHub stats
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { GitHubUser } from '../types/github.types';

type GitHubAchievementInput = Prisma.AchievementCreateManyInput;

// Achievement thresholds
const STAR_THRESHOLD = 100;
const REPO_THRESHOLD = 20;

@Injectable()
export class GitHubAchievementService {
  generateAchievements(
    resumeId: string,
    githubUsername: string,
    profile: GitHubUser,
    totalStars: number,
  ): GitHubAchievementInput[] {
    const achievements: GitHubAchievementInput[] = [];

    if (totalStars >= STAR_THRESHOLD) {
      achievements.push(
        this.createStarsAchievement(resumeId, githubUsername, totalStars),
      );
    }

    if (profile.public_repos >= REPO_THRESHOLD) {
      achievements.push(
        this.createReposAchievement(
          resumeId,
          githubUsername,
          profile.public_repos,
        ),
      );
    }

    return achievements;
  }

  private createStarsAchievement(
    resumeId: string,
    githubUsername: string,
    totalStars: number,
  ): GitHubAchievementInput {
    return {
      resumeId,
      type: 'github_stars',
      title: `${totalStars}+ GitHub Stars`,
      description: `Accumulated ${totalStars} stars across all repositories`,
      verificationUrl: `https://github.com/${githubUsername}`,
      achievedAt: new Date(),
      value: totalStars,
    };
  }

  private createReposAchievement(
    resumeId: string,
    githubUsername: string,
    repoCount: number,
  ): GitHubAchievementInput {
    return {
      resumeId,
      type: 'custom',
      title: `${repoCount} Public Repositories`,
      description:
        'Active open source contributor with multiple public projects',
      verificationUrl: `https://github.com/${githubUsername}?tab=repositories`,
      achievedAt: new Date(),
      value: repoCount,
    };
  }
}
