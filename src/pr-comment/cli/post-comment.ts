#!/usr/bin/env bun
/**
 * CLI: Post PR Comment
 *
 * Posts or updates a comment on a GitHub Pull Request with SVG content.
 *
 * Usage:
 *   bun post-comment.ts --pr=123 --svg=card.svg
 *   cat card.svg | bun post-comment.ts --pr=123 --stdin
 *
 * Environment:
 *   GITHUB_TOKEN    GitHub API token (required)
 *   GITHUB_OWNER    Repository owner (default: from GITHUB_REPOSITORY)
 *   GITHUB_REPO     Repository name (default: from GITHUB_REPOSITORY)
 *
 * Output:
 *   Comment URL on success
 */

import { z } from 'zod';
import { createGitHubClient } from '../infrastructure/github-client';

// =============================================================================
// Constants
// =============================================================================

const COMMENT_TAG = 'ci-status-card';

// =============================================================================
// Input Validation
// =============================================================================

const EnvSchema = z.object({
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
  GITHUB_OWNER: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  GITHUB_REPOSITORY: z.string().optional(),
});

// =============================================================================
// CLI Implementation
// =============================================================================

function printUsage(): void {
  console.error('Usage: post-comment --pr=<number> --svg=<path>');
  console.error('       post-comment --pr=<number> --stdin');
  console.error('');
  console.error('Options:');
  console.error('  --pr=<number>   Pull request number (required)');
  console.error('  --svg=<path>    Path to SVG file');
  console.error('  --stdin         Read SVG from stdin');
  console.error('  --tag=<string>  Comment tag for updates (default: ci-status-card)');
  console.error('');
  console.error('Environment:');
  console.error('  GITHUB_TOKEN       GitHub API token (required)');
  console.error('  GITHUB_REPOSITORY  owner/repo format (or set GITHUB_OWNER + GITHUB_REPO)');
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function readFile(path: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  return readFile(path, 'utf-8');
}

function parseArgs(): { prNumber?: number; svgPath?: string; stdin: boolean; tag: string } {
  const args = process.argv.slice(2);
  const result = {
    prNumber: undefined as number | undefined,
    svgPath: undefined as string | undefined,
    stdin: false,
    tag: COMMENT_TAG,
  };

  for (const arg of args) {
    if (arg === '--stdin') {
      result.stdin = true;
    } else if (arg.startsWith('--pr=')) {
      result.prNumber = parseInt(arg.replace('--pr=', ''), 10);
    } else if (arg.startsWith('--svg=')) {
      result.svgPath = arg.replace('--svg=', '');
    } else if (arg.startsWith('--tag=')) {
      result.tag = arg.replace('--tag=', '');
    }
  }

  return result;
}

function parseRepository(): { owner: string; repo: string } {
  const env = EnvSchema.parse(process.env);

  // Try explicit OWNER/REPO first
  if (env.GITHUB_OWNER && env.GITHUB_REPO) {
    return { owner: env.GITHUB_OWNER, repo: env.GITHUB_REPO };
  }

  // Fall back to GITHUB_REPOSITORY (owner/repo format)
  if (env.GITHUB_REPOSITORY) {
    const [owner, repo] = env.GITHUB_REPOSITORY.split('/');
    if (owner && repo) {
      return { owner, repo };
    }
  }

  throw new Error(
    'Could not determine repository. Set GITHUB_REPOSITORY or GITHUB_OWNER + GITHUB_REPO',
  );
}

async function main(): Promise<void> {
  try {
    const args = parseArgs();

    // Validate PR number
    if (!args.prNumber || Number.isNaN(args.prNumber)) {
      console.error('Error: --pr=<number> is required');
      printUsage();
      process.exit(1);
    }

    // Get SVG content
    let svgContent: string;

    if (args.stdin) {
      svgContent = await readStdin();
    } else if (args.svgPath) {
      svgContent = await readFile(args.svgPath);
    } else {
      console.error('Error: Either --svg=<path> or --stdin is required');
      printUsage();
      process.exit(1);
    }

    // Validate SVG content
    if (!svgContent.trim()) {
      console.error('Error: SVG content is empty');
      process.exit(1);
    }

    // Parse environment
    const env = EnvSchema.parse(process.env);
    const { owner, repo } = parseRepository();

    // Create GitHub client
    const github = createGitHubClient({
      token: env.GITHUB_TOKEN,
      owner,
      repo,
    });

    // Post comment
    await github.postComment(args.prNumber, svgContent, args.tag);

    console.log(`Comment posted to PR #${args.prNumber}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment error:', JSON.stringify(error.flatten().fieldErrors, null, 2));
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

main();
