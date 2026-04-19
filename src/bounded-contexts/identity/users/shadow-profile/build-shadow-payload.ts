import type { ShadowGithubRepo, ShadowGithubUser } from './ports/github-api.port';

export interface ShadowPayload {
  headline: string | null;
  primaryStack: string[];
  projects: Array<{ name: string; url: string; summary: string }>;
  stats: {
    totalRepos: number;
    nonForkRepos: number;
    totalStars: number;
  };
}

const MIN_LANGUAGE_BYTES = 1000;

export function buildShadowPayload(
  user: ShadowGithubUser,
  repos: ShadowGithubRepo[],
): ShadowPayload {
  const active = repos.filter((r) => !r.isFork && !r.isArchived);
  const langBytes = aggregateLanguages(active);
  const primaryStack = langBytes
    .filter((x) => x.bytes >= MIN_LANGUAGE_BYTES)
    .slice(0, 8)
    .map((x) => x.language);

  const totalStars = active.reduce((acc, r) => acc + r.stars, 0);
  const top = [...active]
    .sort((a, b) => b.stars - a.stars || (b.pushedAt ?? '').localeCompare(a.pushedAt ?? ''))
    .slice(0, 5)
    .map((r) => ({
      name: r.name,
      url: r.url,
      summary: r.description ?? `${r.name} — ${Object.keys(r.languages).slice(0, 2).join(', ')}`,
    }));

  const headline = user.bio?.length && user.bio.length >= 8 ? user.bio.slice(0, 120) : null;

  return {
    headline,
    primaryStack,
    projects: top,
    stats: { totalRepos: repos.length, nonForkRepos: active.length, totalStars },
  };
}

function aggregateLanguages(repos: ShadowGithubRepo[]): Array<{ language: string; bytes: number }> {
  const totals = new Map<string, number>();
  for (const repo of repos) {
    for (const [lang, bytes] of Object.entries(repo.languages ?? {})) {
      totals.set(lang, (totals.get(lang) ?? 0) + bytes);
    }
  }
  return [...totals.entries()]
    .map(([language, bytes]) => ({ language, bytes }))
    .sort((a, b) => b.bytes - a.bytes);
}
