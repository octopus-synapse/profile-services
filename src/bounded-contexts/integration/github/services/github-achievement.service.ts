/**
 * GitHub Achievement Service
 * Single Responsibility: Generate achievements based on GitHub stats
 *
 * GENERIC SECTIONS: Returns achievement content for SectionItem, not legacy Achievement model.
 */

import { Injectable } from '@nestjs/common';
import type { GitHubUser } from '../types/github.types';

/**
 * Achievement content structure for SectionItem.content
 */
export interface GitHubAchievementContent {
  type: string;
  title: string;
  description: string;
  verificationUrl: string;
  achievedAt: string;
  value: number;
}

// Achievement thresholds
const STAR_THRESHOLD = 100;
const REPO_THRESHOLD = 20;

@Injectable()
export class GitHubAchievementService {
  generateAchievements(
    githubUsername: string,
    profile: GitHubUser,
    totalStars: number,
  ): GitHubAchievementContent[] {
    const achievements: GitHubAchievementContent[] = [];

    if (totalStars >= STAR_THRESHOLD) {
      achievements.push(this.createStarsAchievement(githubUsername, totalStars));
    }

    if (profile.public_repos >= REPO_THRESHOLD) {
      achievements.push(this.createReposAchievement(githubUsername, profile.public_repos));
    }

    return achievements;
  }

  private createStarsAchievement(
    githubUsername: string,
    totalStars: number,
  ): GitHubAchievementContent {
    return {
      type: 'github_stars',
      title: `${totalStars}+ GitHub Stars`,
      description: `Accumulated ${totalStars} stars across all repositories`,
      verificationUrl: `https://github.com/${githubUsername}`,
      achievedAt: new Date().toISOString(),
      value: totalStars,
    };
  }

  private createReposAchievement(
    githubUsername: string,
    repoCount: number,
  ): GitHubAchievementContent {
    return {
      type: 'custom',
      title: `${repoCount} Public Repositories`,
      description: 'Active open source contributor with multiple public projects',
      verificationUrl: `https://github.com/${githubUsername}?tab=repositories`,
      achievedAt: new Date().toISOString(),
      value: repoCount,
    };
  }
}
