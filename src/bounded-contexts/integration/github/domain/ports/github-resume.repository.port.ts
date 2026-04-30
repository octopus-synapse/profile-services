/**
 * Outbound port for the resume-side persistence the GitHub BC needs:
 * ownership check, GitHub-stats update, and the reconcile pass that
 * deletes prior github-sourced section items and inserts the fresh
 * batch. The adapter owns the section-type lookup + transactional
 * write.
 */

import type { Prisma } from '@prisma/client';
import type { GitHubAchievementContent } from '../entities/github-achievement';
import type { GitHubContribution } from '../entities/github-contribution';

export interface ResumeGitHubSyncStatus {
  readonly hasSynced: boolean;
  readonly lastSyncedAt: Date;
  readonly githubUrl: string | null;
  readonly stats: {
    readonly totalStars: number;
    readonly openSourceProjects: number;
    readonly achievements: number;
  };
}

/** Minimum fields the use case needs from the resume row. Adapters
 *  return more — anything extra is allowed and the use case simply
 *  ignores it. */
export interface ResumeOwnershipRow {
  readonly id: string;
  readonly userId: string;
  readonly github: string | null;
  readonly totalStars: number | null;
  readonly updatedAt: Date;
}

export abstract class GitHubResumeRepositoryPort {
  /**
   * Throws `EntityNotFoundException('Resume')` or
   * `ResumeAccessDeniedException` when the resume isn't accessible by
   * `userId`. Returns the row when accessible, optionally enriched
   * by the include shape — used today only for `getSyncStatus` to
   * read section items in the same call.
   */
  abstract verifyResumeOwnership(
    userId: string,
    resumeId: string,
    include?: Prisma.ResumeInclude,
  ): Promise<ResumeOwnershipRow>;

  abstract updateResumeGitHubStats(
    resumeId: string,
    githubUsername: string,
    totalStars: number,
  ): Promise<void>;

  abstract reconcileSyncedSections(
    resumeId: string,
    githubUsername: string,
    contributions: readonly GitHubContribution[],
    achievements: readonly GitHubAchievementContent[],
  ): Promise<void>;

  abstract getSyncStatus(userId: string, resumeId: string): Promise<ResumeGitHubSyncStatus>;
}
