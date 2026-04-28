/**
 * Orchestrator for a full GitHub sync. Verifies ownership, fetches
 * profile + repos, computes total stars, persists the stats, and
 * delegates to the contribution + achievement services to build the
 * section payload before reconciling the DB. Domain failures propagate
 * untouched; everything else is normalized to
 * `GitHubSyncFailedException` so the controller layer can show a
 * coherent error.
 */

import { API_LIMITS } from '@/shared-kernel';
import { DomainException } from '@/shared-kernel/exceptions';
import {
  GitHubSyncFailedException,
  GitHubUsernameMissingException,
} from '../../../domain/exceptions/integration.exceptions';
import { GitHubApiPort } from '../../domain/ports/github-api.port';
import { GitHubResumeRepositoryPort } from '../../domain/ports/github-resume.repository.port';
import { extractGitHubUsername } from '../../domain/value-objects/github-username';
import { GitHubAchievementService } from './github-achievement.service';
import { GitHubContributionService } from './github-contribution.service';

export interface GitHubSyncResult {
  readonly profile: {
    username: string;
    name: string | null;
    bio: string | null;
    publicRepos: number;
  };
  readonly stats: {
    totalStars: number;
    publicRepos: number;
    contributionsAdded: number;
    achievementsAdded: number;
  };
}

export class GitHubSyncService {
  constructor(
    private readonly api: GitHubApiPort,
    private readonly resumes: GitHubResumeRepositoryPort,
    private readonly contributions: GitHubContributionService,
    private readonly achievements: GitHubAchievementService,
  ) {}

  async syncUserGitHub(
    userId: string,
    githubUsername: string,
    resumeId: string,
  ): Promise<GitHubSyncResult> {
    await this.resumes.verifyResumeOwnership(userId, resumeId);

    try {
      const profile = await this.api.getUserProfile(githubUsername);
      const repos = await this.api.getUserRepos(githubUsername, {
        sort: 'updated',
        per_page: 100,
      });
      const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

      await this.resumes.updateResumeGitHubStats(resumeId, githubUsername, totalStars);

      const contributions = await this.contributions.processContributions(
        resumeId,
        githubUsername,
        repos.slice(0, API_LIMITS.MAX_REPOS_TO_PROCESS),
      );
      const achievements = this.achievements.generateAchievements(
        githubUsername,
        profile,
        totalStars,
      );

      await this.resumes.reconcileSyncedSections(
        resumeId,
        githubUsername,
        contributions,
        achievements,
      );

      return {
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
      if (error instanceof DomainException) throw error;
      throw new GitHubSyncFailedException();
    }
  }

  async autoSyncGitHubFromResume(userId: string, resumeId: string): Promise<GitHubSyncResult> {
    const resume = await this.resumes.verifyResumeOwnership(userId, resumeId);
    if (!resume.github) throw new GitHubUsernameMissingException();
    const githubUsername = extractGitHubUsername(resume.github);
    return this.syncUserGitHub(userId, githubUsername, resumeId);
  }
}
