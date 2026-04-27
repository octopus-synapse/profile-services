/**
 * Outbound port for the GitHub REST surface. Adapters MUST translate
 * HTTP failures into the BC's domain exceptions (or framework-level
 * `HttpException`); the use cases never see a `Response` object.
 *
 * `count*` methods are best-effort enrichment — adapters degrade to
 * 0 on a private repo or rate-limit hit and log the failure rather
 * than aborting the whole sync.
 */

import type { GitHubFetchOptions, GitHubRepo, GitHubUser } from '../../types/github.types';

export abstract class GitHubApiPort {
  abstract getUserProfile(username: string): Promise<GitHubUser>;
  abstract getUserRepos(username: string, options?: GitHubFetchOptions): Promise<GitHubRepo[]>;
  abstract getRepoCommitCount(owner: string, repo: string, username: string): Promise<number>;
  abstract getRepoPullRequests(owner: string, repo: string, username: string): Promise<number>;
  abstract getRepoIssues(owner: string, repo: string, username: string): Promise<number>;
}
