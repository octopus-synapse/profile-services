export function extractGitHubUsername(githubUrl: string): string {
  return githubUrl
    .replace('https://github.com/', '')
    .replace('http://github.com/', '')
    .replace('github.com/', '')
    .split('/')[0];
}
