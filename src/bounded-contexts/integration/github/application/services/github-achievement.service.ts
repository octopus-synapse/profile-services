/**
 * Generates achievement entries from a GitHub profile + star total.
 * Pure transformation — no I/O, no logging — so it lives as a
 * domain-flavored application service the sync orchestrator calls.
 *
 * Thresholds: 100 stars across all repos / 20 public repos. Both
 * trigger independent achievements when met.
 */

import type { GitHubAchievementContent } from '../../domain/entities/github-achievement';
import type { GitHubUser } from '../../types/github.types';

const STAR_THRESHOLD = 100;
const REPO_THRESHOLD = 20;

export class GitHubAchievementService {
  generateAchievements(
    githubUsername: string,
    profile: GitHubUser,
    totalStars: number,
  ): GitHubAchievementContent[] {
    const achievements: GitHubAchievementContent[] = [];

    if (totalStars >= STAR_THRESHOLD) {
      achievements.push({
        type: 'github_stars',
        title: `${totalStars}+ GitHub Stars`,
        description: `Accumulated ${totalStars} stars across all repositories`,
        verificationUrl: `https://github.com/${githubUsername}`,
        achievedAt: new Date().toISOString(),
        value: totalStars,
      });
    }

    if (profile.public_repos >= REPO_THRESHOLD) {
      achievements.push({
        type: 'custom',
        title: `${profile.public_repos} Public Repositories`,
        description: 'Active open source contributor with multiple public projects',
        verificationUrl: `https://github.com/${githubUsername}?tab=repositories`,
        achievedAt: new Date().toISOString(),
        value: profile.public_repos,
      });
    }

    return achievements;
  }
}
