/**
 * Strips the protocol/host prefix off a GitHub URL, returning just the
 * `<username>` portion. Idempotent — passing a bare username through
 * is a no-op.
 */
export function extractGitHubUsername(githubUrl: string): string {
  return githubUrl
    .replace('https://github.com/', '')
    .replace('http://github.com/', '')
    .replace('github.com/', '')
    .split('/')[0]!;
}
