/**
 * REST-API implementation of `GitHubApiPort`. Authenticates with the
 * `GITHUB_TOKEN` env var when available; falls back to anonymous calls
 * (subject to the lower rate-limit budget). Maps 404/403/other to
 * domain exceptions (`EntityNotFoundException`, `ForbiddenException`,
 * `GitHubApiRequestFailedException`) which the global filter serializes.
 *
 * Per-repo `count*` calls degrade to 0 + a warn log on failure so a
 * private repo or rate limit doesn't take down the whole sync.
 */

import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException, ForbiddenException } from '@/shared-kernel/exceptions';
import {
  ExternalHandleInvalidException,
  GitHubApiRequestFailedException,
  IntegrationAuthFailedException,
  IntegrationRateLimitedException,
  IntegrationResponseInvalidException,
  IntegrationTimeoutException,
} from '../../../../domain/exceptions';
import { GitHubApiPort } from '../../../domain/ports/github-api.port';
import type { GitHubFetchOptions, GitHubRepo, GitHubUser } from '../../../types/github.types';

const CTX = 'OctokitGitHubApiAdapter';
const API_URL = 'https://api.github.com';
const PROVIDER = 'GitHub';
/** Per-request timeout. Bounded so a hung GitHub call doesn't keep
 *  worker queues open indefinitely. */
const REQUEST_TIMEOUT_MS = 10_000;
/** GitHub usernames are 1-39 characters of alphanumerics or single
 *  hyphens, never starting/ending with a hyphen.
 *  Source: https://github.com/shinnn/github-username-regex */
const GITHUB_USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

/** Structural shape of the bits we need from `ConfigService` — keeps
 * the adapter framework-free at the type level. */
interface ConfigReader {
  get<T = string>(key: string): T | undefined;
}

export class OctokitGitHubApiAdapter extends GitHubApiPort {
  private readonly githubToken: string;

  constructor(
    config: ConfigReader,
    private readonly logger: LoggerPort,
  ) {
    super();
    this.githubToken = config.get<string>('GITHUB_TOKEN') ?? '';
  }

  async getUserProfile(username: string): Promise<GitHubUser> {
    this.assertValidHandle(username);
    return this.fetch<GitHubUser>(`/users/${username}`);
  }

  async getUserRepos(username: string, options: GitHubFetchOptions = {}): Promise<GitHubRepo[]> {
    this.assertValidHandle(username);
    const sort = options.sort ?? 'updated';
    const perPage = options.per_page ?? 100;
    return this.fetch<GitHubRepo[]>(`/users/${username}/repos?sort=${sort}&per_page=${perPage}`);
  }

  private assertValidHandle(username: string): void {
    if (!GITHUB_USERNAME_PATTERN.test(username)) {
      throw new ExternalHandleInvalidException(PROVIDER);
    }
  }

  async getRepoCommitCount(owner: string, repo: string, username: string): Promise<number> {
    return this.countOptional(
      `/repos/${owner}/${repo}/commits?author=${username}&per_page=100`,
      'commits',
    );
  }

  async getRepoPullRequests(owner: string, repo: string, username: string): Promise<number> {
    return this.countOptional(
      `/repos/${owner}/${repo}/pulls?creator=${username}&state=all&per_page=100`,
      'pulls',
    );
  }

  async getRepoIssues(owner: string, repo: string, username: string): Promise<number> {
    return this.countOptional(
      `/repos/${owner}/${repo}/issues?creator=${username}&state=all&per_page=100`,
      'issues',
    );
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
    if (this.githubToken) headers.Authorization = `Bearer ${this.githubToken}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, { headers, signal: controller.signal });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        throw new IntegrationTimeoutException(PROVIDER);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) this.handleApiError(response);
    try {
      return (await response.json()) as T;
    } catch {
      // GitHub returned a non-JSON body on a 2xx — that should never
      // happen in practice but if it does we surface a domain error
      // rather than a generic SyntaxError up the stack.
      throw new IntegrationResponseInvalidException(PROVIDER, 'response body is not valid JSON');
    }
  }

  private async countOptional(endpoint: string, kind: string): Promise<number> {
    try {
      const items = await this.fetch<unknown[]>(endpoint);
      return Array.isArray(items) ? items.length : 0;
    } catch (err) {
      this.logger.warn(
        `GitHub ${kind} count failed for ${endpoint}: ${err instanceof Error ? err.message : 'unknown'}`,
        CTX,
      );
      return 0;
    }
  }

  private handleApiError(response: Response): never {
    if (response.status === 401) {
      throw new IntegrationAuthFailedException(PROVIDER);
    }
    if (response.status === 404) {
      throw new EntityNotFoundException('GitHub resource');
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const seconds = retryAfter ? Number.parseInt(retryAfter, 10) : undefined;
      throw new IntegrationRateLimitedException(
        PROVIDER,
        Number.isFinite(seconds) ? seconds : undefined,
      );
    }
    if (response.status === 403) {
      // GitHub overloads 403 for both "auth-required" rate-limit and
      // straight-up forbidden. The `X-RateLimit-Remaining: 0` header
      // is the discriminator.
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        const reset = response.headers.get('x-ratelimit-reset');
        const resetEpoch = reset ? Number.parseInt(reset, 10) : NaN;
        const seconds = Number.isFinite(resetEpoch)
          ? Math.max(0, resetEpoch - Math.floor(Date.now() / 1000))
          : undefined;
        throw new IntegrationRateLimitedException(PROVIDER, seconds);
      }
      throw new ForbiddenException('GitHub API rate limit exceeded');
    }
    throw new GitHubApiRequestFailedException(response.url, response.status);
  }
}
