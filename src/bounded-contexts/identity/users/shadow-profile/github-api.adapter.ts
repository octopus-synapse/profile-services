import { Injectable, Logger } from '@nestjs/common';
import type { ShadowGithubApi, ShadowGithubRepo, ShadowGithubUser } from './ports/github-api.port';

const BASE = 'https://api.github.com';
const UA = 'patch-careers/1.0';

interface GhUserResponse {
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  company: string | null;
  public_repos: number;
  followers: number;
}

interface GhRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string | null;
  html_url: string;
  topics?: string[];
  fork: boolean;
  archived: boolean;
  languages_url: string;
}

@Injectable()
export class ShadowGithubApiAdapter implements ShadowGithubApi {
  private readonly logger = new Logger(ShadowGithubApiAdapter.name);

  async getUser(token: string, username?: string): Promise<ShadowGithubUser> {
    const path = username ? `/users/${encodeURIComponent(username)}` : '/user';
    const body = await this.request<GhUserResponse>(token, path);
    return {
      login: body.login,
      name: body.name,
      bio: body.bio,
      location: body.location,
      company: body.company,
      publicRepos: body.public_repos,
      followers: body.followers,
    };
  }

  async listRepositories(
    token: string,
    username: string,
    options: { limit?: number } = {},
  ): Promise<ShadowGithubRepo[]> {
    const limit = Math.min(options.limit ?? 30, 100);
    const path = `/users/${encodeURIComponent(username)}/repos?per_page=${limit}&sort=pushed`;
    const repos = await this.request<GhRepoResponse[]>(token, path);

    const summaries: ShadowGithubRepo[] = [];
    for (const repo of repos) {
      const languages = await this.fetchLanguages(token, repo.languages_url).catch(() => ({}));
      summaries.push({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        primaryLanguage: repo.language,
        languages,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        pushedAt: repo.pushed_at,
        url: repo.html_url,
        topics: repo.topics ?? [],
        isFork: repo.fork,
        isArchived: repo.archived,
      });
    }
    return summaries;
  }

  private async fetchLanguages(token: string, url: string): Promise<Record<string, number>> {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': UA,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!res.ok) throw new Error(`GitHub languages ${res.status}`);
    return (await res.json()) as Record<string, number>;
  }

  private async request<T>(token: string, path: string): Promise<T> {
    const url = `${BASE}${path}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': UA,
        Accept: 'application/vnd.github+json',
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`GitHub ${path} failed ${res.status}: ${body.slice(0, 200)}`);
      throw new Error(`GitHub API ${path} ${res.status}`);
    }
    return (await res.json()) as T;
  }
}
