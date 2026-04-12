/**
 * Git Client Infrastructure
 *
 * Adapter for git operations with dependency injection for testability.
 * Uses Bun shell ($) for safe command execution with no user input interpolation.
 */

import type { GitContext } from '../domain/types';

// =============================================================================
// Types
// =============================================================================

export type ExecFn = (cmd: string) => Promise<{ stdout: string; exitCode: number }>;

export interface GitClient {
  getCommitInfo(): Promise<GitContext>;
}

// =============================================================================
// Default Exec Implementation
// =============================================================================

async function defaultExecGit(cmd: string): Promise<{ stdout: string; exitCode: number }> {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);

  try {
    const { stdout } = await run('sh', ['-c', cmd]);
    return { stdout: stdout.trim(), exitCode: 0 };
  } catch (error: unknown) {
    const err = error as { stdout?: string; code?: number };
    return { stdout: err.stdout?.trim() ?? '', exitCode: err.code ?? 1 };
  }
}

// =============================================================================
// Git Client Factory
// =============================================================================

export function createGitClient(execFn: ExecFn = defaultExecGit): GitClient {
  async function getCommitHash(): Promise<string> {
    // Prefer environment variable (GitHub Actions)
    if (process.env.GITHUB_SHA) {
      return process.env.GITHUB_SHA.slice(0, 8);
    }
    const { stdout } = await execFn('git rev-parse HEAD');
    return stdout.slice(0, 8);
  }

  async function getCommitMessage(): Promise<string> {
    const { stdout } = await execFn("git log -1 --format='%s'");
    return stdout.replace(/^'|'$/g, '');
  }

  async function getCommitAuthor(): Promise<string> {
    const { stdout } = await execFn("git log -1 --format='%an'");
    return stdout.replace(/^'|'$/g, '');
  }

  async function getCoAuthors(): Promise<string[]> {
    const { stdout } = await execFn("git log -1 --format='%b'");
    const body = stdout.replace(/^'|'$/g, '');

    const coAuthorRegex = /Co-authored-by:\s*([^<\n]+)/gi;
    const matches = Array.from(body.matchAll(coAuthorRegex), (m) => m[1].trim());

    return matches.slice(0, 2); // Max 2 co-authors
  }

  async function getBranch(): Promise<string> {
    // Prefer environment variable (GitHub Actions)
    if (process.env.GITHUB_REF_NAME) {
      return process.env.GITHUB_REF_NAME;
    }
    if (process.env.GITHUB_HEAD_REF) {
      return process.env.GITHUB_HEAD_REF;
    }
    const { stdout } = await execFn('git rev-parse --abbrev-ref HEAD');
    return stdout;
  }

  function getRunNumber(): number {
    return parseInt(process.env.GITHUB_RUN_NUMBER ?? '0', 10);
  }

  function getTimestamp(): string {
    return `${new Date().toISOString().slice(11, 16)} UTC`;
  }

  return {
    async getCommitInfo(): Promise<GitContext> {
      const [commit_hash, commit_message, commit_author, co_authors, branch] = await Promise.all([
        getCommitHash(),
        getCommitMessage(),
        getCommitAuthor(),
        getCoAuthors(),
        getBranch(),
      ]);

      return {
        commit_hash,
        commit_message,
        commit_author,
        co_authors,
        branch,
        run_number: getRunNumber(),
        timestamp: getTimestamp(),
      };
    },
  };
}
