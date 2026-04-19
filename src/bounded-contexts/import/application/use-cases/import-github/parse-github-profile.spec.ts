import { describe, expect, it } from 'bun:test';
import type { GithubRepoSummary, GithubUserSummary } from './github-api.port';
import { parseGithubProfile } from './parse-github-profile';

const baseUser: GithubUserSummary = {
  login: 'enzoferracini',
  name: 'Enzo',
  bio: 'Backend engineer building career tools',
  location: 'São Paulo',
  company: 'Patch Careers',
  publicRepos: 5,
  followers: 10,
};

function repo(overrides: Partial<GithubRepoSummary>): GithubRepoSummary {
  return {
    name: 'repo',
    fullName: 'enzo/repo',
    description: null,
    primaryLanguage: null,
    languages: {},
    stars: 0,
    forks: 0,
    pushedAt: '2026-01-01T00:00:00Z',
    url: 'https://github.com/enzo/repo',
    topics: [],
    isFork: false,
    isArchived: false,
    ...overrides,
  };
}

describe('parseGithubProfile', () => {
  it('uses the GitHub bio as the headline when present', () => {
    const parsed = parseGithubProfile(baseUser, [repo({ languages: { TypeScript: 5000 } })]);
    expect(parsed.suggestedHeadline).toContain('Backend');
  });

  it('aggregates languages across repos by total bytes', () => {
    const repos = [
      repo({ languages: { TypeScript: 10000 } }),
      repo({ name: 'repo2', languages: { TypeScript: 5000, Rust: 4000 } }),
      repo({ name: 'repo3', languages: { Python: 3000 } }),
    ];
    const parsed = parseGithubProfile(baseUser, repos);
    expect(parsed.stats.languagesByBytes[0].language).toBe('TypeScript');
    expect(parsed.stats.languagesByBytes[0].bytes).toBe(15000);
  });

  it('drops forked and archived repos from active aggregations', () => {
    const repos = [
      repo({ languages: { TypeScript: 10000 } }),
      repo({ name: 'fork', languages: { Python: 99999 }, isFork: true }),
      repo({ name: 'archived', languages: { Ruby: 99999 }, isArchived: true }),
    ];
    const parsed = parseGithubProfile(baseUser, repos);
    const langs = parsed.stats.languagesByBytes.map((l) => l.language);
    expect(langs).toContain('TypeScript');
    expect(langs).not.toContain('Python');
    expect(langs).not.toContain('Ruby');
  });

  it('produces bullets with language suffix and star count for popular repos', () => {
    const repos = [
      repo({
        name: 'hotshot',
        description: 'Fast job aggregator',
        languages: { Go: 20000 },
        stars: 42,
      }),
    ];
    const parsed = parseGithubProfile(baseUser, repos);
    expect(parsed.projectBullets[0].bullet).toContain('Go');
    expect(parsed.projectBullets[0].bullet).toContain('★42');
  });

  it('returns null summary when there are no active repos', () => {
    const parsed = parseGithubProfile(baseUser, [repo({ isFork: true })]);
    expect(parsed.suggestedSummary).toBeNull();
  });
});
