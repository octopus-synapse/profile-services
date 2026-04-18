interface RepoRow {
  name: string;
  description?: string | null;
  url: string;
}

export function toPinnedRepos(
  repos: RepoRow[],
): Array<{ name: string; description?: string; url: string }> {
  const out: Array<{ name: string; description?: string; url: string }> = [];
  for (const repo of repos) {
    out.push({
      name: repo.name,
      description: repo.description ?? undefined,
      url: repo.url,
    });
  }
  return out;
}
