/**
 * Local re-declaration of the GitHub shape needed by the shadow-profile
 * builder. Declared here (instead of importing from the `import` BC) so
 * this module stays independent — architectural rules forbid cross-BC
 * type imports. The concrete adapter is still the one registered under
 * GITHUB_API_PORT by the ImportModule at runtime; DI will resolve it
 * via an inter-module provider registration.
 */

export const SHADOW_GITHUB_API = Symbol('ShadowGithubApi');

export interface ShadowGithubUser {
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  company: string | null;
  publicRepos: number;
  followers: number;
}

export interface ShadowGithubRepo {
  name: string;
  fullName: string;
  description: string | null;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  stars: number;
  forks: number;
  pushedAt: string | null;
  url: string;
  topics: string[];
  isFork: boolean;
  isArchived: boolean;
}

export interface ShadowGithubApi {
  getUser(token: string, username?: string): Promise<ShadowGithubUser>;
  listRepositories(
    token: string,
    username: string,
    options?: { limit?: number },
  ): Promise<ShadowGithubRepo[]>;
}
