import type { GithubRepoSummary, GithubUserSummary } from './github-api.port';

export interface ParsedGithubProfile {
  suggestedHeadline: string | null;
  suggestedSummary: string | null;
  primaryStack: string[];
  projectBullets: ProjectBullet[];
  stats: {
    totalRepos: number;
    nonForkRepos: number;
    totalStars: number;
    languagesByBytes: Array<{ language: string; bytes: number }>;
  };
}

export interface ProjectBullet {
  name: string;
  url: string;
  description: string | null;
  languages: string[];
  bullet: string;
}

const MIN_LANGUAGE_BYTES = 1000;

export function parseGithubProfile(
  user: GithubUserSummary,
  repos: GithubRepoSummary[],
): ParsedGithubProfile {
  const active = repos.filter((r) => !r.isFork && !r.isArchived);
  const byLangBytes = aggregateLanguages(active);
  const primaryStack = byLangBytes
    .filter((x) => x.bytes >= MIN_LANGUAGE_BYTES)
    .slice(0, 8)
    .map((x) => x.language);

  const topProjects = [...active]
    .sort((a, b) => b.stars - a.stars || (b.pushedAt ?? '').localeCompare(a.pushedAt ?? ''))
    .slice(0, 5)
    .map(toBullet);

  const totalStars = active.reduce((acc, r) => acc + r.stars, 0);
  const headline = buildHeadline(user, primaryStack);
  const summary = buildSummary(user, active.length, totalStars, primaryStack);

  return {
    suggestedHeadline: headline,
    suggestedSummary: summary,
    primaryStack,
    projectBullets: topProjects,
    stats: {
      totalRepos: repos.length,
      nonForkRepos: active.length,
      totalStars,
      languagesByBytes: byLangBytes,
    },
  };
}

function aggregateLanguages(
  repos: GithubRepoSummary[],
): Array<{ language: string; bytes: number }> {
  const totals = new Map<string, number>();
  for (const repo of repos) {
    for (const [lang, bytes] of Object.entries(repo.languages ?? {})) {
      totals.set(lang, (totals.get(lang) ?? 0) + bytes);
    }
    if (repo.primaryLanguage && !repo.languages) {
      totals.set(
        repo.primaryLanguage,
        (totals.get(repo.primaryLanguage) ?? 0) + MIN_LANGUAGE_BYTES,
      );
    }
  }
  return [...totals.entries()]
    .map(([language, bytes]) => ({ language, bytes }))
    .sort((a, b) => b.bytes - a.bytes);
}

function toBullet(repo: GithubRepoSummary): ProjectBullet {
  const languages = Object.keys(repo.languages ?? {}).slice(0, 3);
  const langSuffix = languages.length > 0 ? ` using ${languages.join(', ')}` : '';
  const base = repo.description ?? repo.name;
  const starsClause = repo.stars >= 10 ? ` (★${repo.stars})` : '';
  return {
    name: repo.name,
    url: repo.url,
    description: repo.description,
    languages,
    bullet: `${base}${langSuffix}${starsClause}.`,
  };
}

function buildHeadline(user: GithubUserSummary, stack: string[]): string | null {
  if (user.bio && user.bio.length >= 8) return user.bio.slice(0, 120);
  if (stack.length === 0) return null;
  return `${stack[0]} developer${stack[1] ? ` with ${stack.slice(1, 3).join(' and ')} experience` : ''}`;
}

function buildSummary(
  user: GithubUserSummary,
  repoCount: number,
  totalStars: number,
  stack: string[],
): string | null {
  if (repoCount === 0) return null;
  const parts: string[] = [];
  parts.push(
    `${user.name ?? user.login} has ${repoCount} public ${repoCount === 1 ? 'repository' : 'repositories'} on GitHub`,
  );
  if (totalStars > 0) parts.push(`with ${totalStars} total stars`);
  if (stack.length > 0) parts.push(`working primarily in ${stack.slice(0, 3).join(', ')}`);
  if (user.location) parts.push(`based in ${user.location}`);
  return `${parts.join(', ')}.`;
}
