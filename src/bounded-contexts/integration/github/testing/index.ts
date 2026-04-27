/**
 * In-memory test doubles for the GitHub BC ports. Adapters are
 * faithful enough for the use case specs:
 *  - `InMemoryGitHubApi` returns whatever profile/repos a test
 *    seeds; activity counts default to 0.
 *  - `InMemoryGitHubResumeRepository` enforces ownership and
 *    records every reconcile/update so specs can assert on the
 *    intended persistence side-effects.
 */

import type { Prisma } from '@prisma/client';
import type { GitHubAchievementContent } from '../domain/entities/github-achievement';
import type { GitHubContribution } from '../domain/entities/github-contribution';
import { GitHubApiPort } from '../domain/ports/github-api.port';
import {
  GitHubResumeRepositoryPort,
  type ResumeGitHubSyncStatus,
} from '../domain/ports/github-resume.repository.port';
import type { GitHubFetchOptions, GitHubRepo, GitHubUser } from '../types/github.types';

export class InMemoryGitHubApi extends GitHubApiPort {
  private profile: GitHubUser | null = null;
  private repos: GitHubRepo[] = [];
  private commitCounts = new Map<string, number>();
  private prCounts = new Map<string, number>();

  seedProfile(profile: GitHubUser): void {
    this.profile = profile;
  }
  seedRepos(repos: GitHubRepo[]): void {
    this.repos = repos;
  }
  setCommitCount(repoFullName: string, count: number): void {
    this.commitCounts.set(repoFullName, count);
  }
  setPrCount(repoFullName: string, count: number): void {
    this.prCounts.set(repoFullName, count);
  }

  async getUserProfile(_username: string): Promise<GitHubUser> {
    if (!this.profile) throw new Error('No profile seeded');
    return this.profile;
  }
  async getUserRepos(_username: string, _options?: GitHubFetchOptions): Promise<GitHubRepo[]> {
    return this.repos;
  }
  async getRepoCommitCount(owner: string, repo: string, _username: string): Promise<number> {
    return this.commitCounts.get(`${owner}/${repo}`) ?? 0;
  }
  async getRepoPullRequests(owner: string, repo: string, _username: string): Promise<number> {
    return this.prCounts.get(`${owner}/${repo}`) ?? 0;
  }
  async getRepoIssues(_owner: string, _repo: string, _username: string): Promise<number> {
    return 0;
  }
}

interface ResumeRow {
  readonly id: string;
  readonly userId: string;
  github: string | null;
  totalStars: number;
  updatedAt: Date;
}

export class InMemoryGitHubResumeRepository extends GitHubResumeRepositoryPort {
  readonly resumes = new Map<string, ResumeRow>();
  syncStatus: ResumeGitHubSyncStatus = {
    hasSynced: false,
    lastSyncedAt: new Date(),
    githubUrl: null,
    stats: { totalStars: 0, openSourceProjects: 0, achievements: 0 },
  };
  readonly statsUpdates: Array<{ resumeId: string; githubUsername: string; totalStars: number }> =
    [];
  readonly reconciles: Array<{
    resumeId: string;
    githubUsername: string;
    contributions: readonly GitHubContribution[];
    achievements: readonly GitHubAchievementContent[];
  }> = [];

  seedResume(row: Partial<ResumeRow> & { id: string; userId: string }): ResumeRow {
    const full: ResumeRow = {
      id: row.id,
      userId: row.userId,
      github: row.github ?? null,
      totalStars: row.totalStars ?? 0,
      updatedAt: row.updatedAt ?? new Date(),
    };
    this.resumes.set(row.id, full);
    return full;
  }

  async verifyResumeOwnership(
    userId: string,
    resumeId: string,
    _include?: Prisma.ResumeInclude,
  ) {
    const row = this.resumes.get(resumeId);
    if (!row) throw new Error(`Resume ${resumeId} not found`);
    if (row.userId !== userId) throw new Error('Resume access denied');
    return row;
  }

  async updateResumeGitHubStats(
    resumeId: string,
    githubUsername: string,
    totalStars: number,
  ): Promise<void> {
    this.statsUpdates.push({ resumeId, githubUsername, totalStars });
    const row = this.resumes.get(resumeId);
    if (row) {
      row.github = `https://github.com/${githubUsername}`;
      row.totalStars = totalStars;
    }
  }

  async reconcileSyncedSections(
    resumeId: string,
    githubUsername: string,
    contributions: readonly GitHubContribution[],
    achievements: readonly GitHubAchievementContent[],
  ): Promise<void> {
    this.reconciles.push({
      resumeId,
      githubUsername,
      contributions: [...contributions],
      achievements: [...achievements],
    });
  }

  async getSyncStatus(_userId: string, _resumeId: string): Promise<ResumeGitHubSyncStatus> {
    return this.syncStatus;
  }
}
