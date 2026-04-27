/**
 * Builds per-repo `GitHubContribution` rows from the raw repo list.
 * Calls the API port for commit/PR counts so the role classifier
 * (`maintainer` / `core_contributor` / `contributor`) has actual
 * activity numbers.
 *
 * `isCurrent` is true when the repo was pushed within the last 90
 * days — gives the resume a sense of which projects are still
 * active for the candidate.
 */

import { TIME_MS } from '@/shared-kernel';
import type { GitHubContribution } from '../../domain/entities/github-contribution';
import { GitHubApiPort } from '../../domain/ports/github-api.port';
import type { GitHubRepo } from '../../types/github.types';

const ACTIVITY_THRESHOLD_DAYS = 90;

export class GitHubContributionService {
  constructor(private readonly api: GitHubApiPort) {}

  async processContributions(
    resumeId: string,
    githubUsername: string,
    repos: GitHubRepo[],
  ): Promise<GitHubContribution[]> {
    const contributions: GitHubContribution[] = [];
    for (const repo of repos) {
      if (this.shouldIncludeRepo(repo, githubUsername)) {
        contributions.push(await this.buildContribution(resumeId, githubUsername, repo));
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
  ): Promise<GitHubContribution> {
    const commits = await this.api.getRepoCommitCount(repo.owner.login, repo.name, githubUsername);
    const pullRequests = await this.api.getRepoPullRequests(
      repo.owner.login,
      repo.name,
      githubUsername,
    );
    const role = this.determineRole(repo, githubUsername, commits, pullRequests);
    const isCurrent = this.isRecentlyActive(repo.pushed_at);

    return {
      resumeId,
      projectName: repo.name,
      projectUrl: repo.html_url,
      role,
      description: repo.description || undefined,
      technologies: repo.topics.length > 0 ? repo.topics : repo.language ? [repo.language] : [],
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
  ): GitHubContribution['role'] {
    if (repo.owner.login === username) return 'maintainer';
    if (commits > 10 || pullRequests > 5) return 'core_contributor';
    return 'contributor';
  }

  private isRecentlyActive(pushedAt: string): boolean {
    const activityThreshold = Date.now() - ACTIVITY_THRESHOLD_DAYS * TIME_MS.DAY;
    return new Date(pushedAt) > new Date(activityThreshold);
  }
}
