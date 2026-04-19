/**
 * GitHub API port — lets tests swap in a canned response without touching
 * the network. Kept deliberately small: we only need what is useful for
 * seeding a resume.
 */

export const GITHUB_API_PORT = Symbol('GithubApiPort');

export interface GithubRepoSummary {
  name: string;
  fullName: string;
  description: string | null;
  primaryLanguage: string | null;
  languages: Record<string, number>; // bytes per language
  stars: number;
  forks: number;
  pushedAt: string | null;
  url: string;
  topics: string[];
  isFork: boolean;
  isArchived: boolean;
}

export interface GithubUserSummary {
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  company: string | null;
  publicRepos: number;
  followers: number;
}

export interface GithubApiPort {
  getUser(token: string, username?: string): Promise<GithubUserSummary>;
  listRepositories(
    token: string,
    username: string,
    options?: { limit?: number },
  ): Promise<GithubRepoSummary[]>;
}
