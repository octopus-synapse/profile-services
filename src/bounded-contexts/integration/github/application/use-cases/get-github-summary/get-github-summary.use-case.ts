/**
 * Public read used by the resume-builder UI: fetches the GitHub
 * profile + top repos for a username, with no DB write. Failures
 * outside the domain envelope are normalized to
 * `GitHubSummaryFetchFailedException` so the global filter renders
 * a stable error code.
 */

import { API_LIMITS } from '@/shared-kernel';
import { DomainException } from '@/shared-kernel/exceptions';
import { GitHubSummaryFetchFailedException } from '../../../../domain/exceptions/integration.exceptions';
import { GitHubApiPort } from '../../../domain/ports/github-api.port';

export interface GitHubSummaryResult {
  readonly username: string;
  readonly name: string | null;
  readonly bio: string | null;
  readonly publicRepos: number;
  readonly totalStars: number;
  readonly topRepos: ReadonlyArray<{
    name: string;
    description: string | null;
    stars: number;
    forks: number;
    language: string | null;
    url: string;
  }>;
}

export class GetGitHubSummaryUseCase {
  constructor(private readonly api: GitHubApiPort) {}

  async execute(username: string): Promise<GitHubSummaryResult> {
    try {
      const profile = await this.api.getUserProfile(username);
      const repos = await this.api.getUserRepos(username, { per_page: 100 });
      const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

      const topRepos = repos
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, API_LIMITS.MAX_CONTRIBUTIONS_TO_SHOW)
        .map((r) => ({
          name: r.name,
          description: r.description,
          stars: r.stargazers_count,
          forks: r.forks_count,
          language: r.language,
          url: r.html_url,
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
      if (error instanceof DomainException) throw error;
      throw new GitHubSummaryFetchFailedException();
    }
  }
}
