/**
 * GitHub Contribution Service
 * Single Responsibility: Process and format contribution data
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GitHubApiService, GitHubRepo } from './github-api.service';
import { TIME_MS } from '../../../common/constants/config';

type GitHubContributionInput = Prisma.OpenSourceContributionCreateManyInput;

const ACTIVITY_THRESHOLD_DAYS = 90;

@Injectable()
export class GitHubContributionService {
  constructor(private readonly apiService: GitHubApiService) {}

  async processContributions(
    resumeId: string,
    githubUsername: string,
    repos: GitHubRepo[],
  ): Promise<GitHubContributionInput[]> {
    const contributions: GitHubContributionInput[] = [];

    for (const repo of repos) {
      if (this.shouldIncludeRepo(repo, githubUsername)) {
        const contribution = await this.buildContribution(
          resumeId,
          githubUsername,
          repo,
        );
        contributions.push(contribution);
      }
    }

    return contributions;
  }

  private shouldIncludeRepo(repo: GitHubRepo, username: string): boolean {
    return repo.stargazers_count > 0 || repo.owner.login === username;
  }

  private async buildContribution(
    resumeId: string,
    githubUsername: string,
    repo: GitHubRepo,
  ): Promise<GitHubContributionInput> {
    const commits = await this.apiService.getRepoCommitCount(
      repo.owner.login,
      repo.name,
      githubUsername,
    );
    const pullRequests = await this.apiService.getRepoPullRequests(
      repo.owner.login,
      repo.name,
      githubUsername,
    );

    const role = this.determineRole(
      repo,
      githubUsername,
      commits,
      pullRequests,
    );
    const isCurrent = this.isRecentlyActive(repo.pushed_at);

    return {
      resumeId,
      projectName: repo.name,
      projectUrl: repo.html_url,
      role,
      description: repo.description || undefined,
      technologies:
        repo.topics.length > 0
          ? repo.topics
          : repo.language
            ? [repo.language]
            : [],
      commits: commits || undefined,
      prsCreated: pullRequests || undefined,
      stars: repo.stargazers_count > 0 ? repo.stargazers_count : undefined,
      startDate: new Date(repo.created_at),
      isCurrent,
    };
  }

  private determineRole(
    repo: GitHubRepo,
    username: string,
    commits: number,
    pullRequests: number,
  ): 'maintainer' | 'core_contributor' | 'contributor' {
    if (repo.owner.login === username) return 'maintainer';
    if (commits > 10 || pullRequests > 5) return 'core_contributor';
    return 'contributor';
  }

  private isRecentlyActive(pushedAt: string): boolean {
    const activityThreshold =
      Date.now() - ACTIVITY_THRESHOLD_DAYS * TIME_MS.DAY;
    return new Date(pushedAt) > new Date(activityThreshold);
  }
}
