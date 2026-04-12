#!/usr/bin/env bun
/**
 * CLI: Post PR Comment
 *
 * Posts or updates a comment on a GitHub Pull Request with CI card image.
 *
 * Usage:
 *   bun post-comment.ts --pr=123 --image=card.png      # PNG as base64 data URI
 *   bun post-comment.ts --pr=123 --svg=card.svg        # Raw SVG (may not render)
 *   bun post-comment.ts --pr=123 --image-url=https://... # External image URL
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
  console.error('Usage: post-comment --pr=<number> --image=<path>');
  console.error('       post-comment --pr=<number> --svg=<path>');
  console.error('       post-comment --pr=<number> --image-url=<url>');
  console.error('       post-comment --pr=<number> --stdin');
  console.error('');
  console.error('Options:');
  console.error('  --pr=<number>        Pull request number (required)');
  console.error('  --image=<path>       Path to PNG file (embedded as base64 data URI)');
  console.error('  --svg=<path>         Path to SVG file (may not render in GitHub)');
  console.error('  --image-url=<url>    External image URL');
  console.error('  --stdin              Read content from stdin');
  console.error('  --tag=<string>       Comment tag for updates (default: ci-status-card)');
  console.error('');
  console.error('Environment:');
  console.error('  GITHUB_TOKEN       GitHub API credential [REDACTED] (required)');
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

interface CliArgs {
  prNumber?: number;
  svgPath?: string;
  imagePath?: string;
  imageUrl?: string;
  stdin: boolean;
  tag: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    prNumber: undefined,
    svgPath: undefined,
    imagePath: undefined,
    imageUrl: undefined,
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
    } else if (arg.startsWith('--image=')) {
      result.imagePath = arg.replace('--image=', '');
    } else if (arg.startsWith('--image-url=')) {
      result.imageUrl = arg.replace('--image-url=', '');
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

async function readImageAsBase64(path: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  const buffer = await readFile(path);
  return buffer.toString('base64');
}

function buildCommentBody(content: string, mode: 'svg' | 'image-base64' | 'image-url'): string {
  const header = '## CI Pipeline Status\n\n';

  switch (mode) {
    case 'image-base64':
      // PNG embedded as base64 data URI
      return `${header}<img src="data:image/png;base64,${content}" alt="CI Pipeline Status" />\n`;
    case 'image-url':
      // External image URL
      return `${header}![CI Pipeline Status](${content})\n`;
    default:
      // Raw SVG (may not render properly in GitHub)
      return `${header}${content}\n`;
  }
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

    // Get content based on input mode
    let commentBody: string;

    if (args.imagePath) {
      // PNG image -> base64 data URI
      const base64 = await readImageAsBase64(args.imagePath);
      commentBody = buildCommentBody(base64, 'image-base64');
    } else if (args.imageUrl) {
      // External image URL
      commentBody = buildCommentBody(args.imageUrl, 'image-url');
    } else if (args.stdin) {
      // Raw content from stdin
      const content = await readStdin();
      commentBody = buildCommentBody(content.trim(), 'svg');
    } else if (args.svgPath) {
      // SVG file (may not render)
      const svgContent = await readFile(args.svgPath);
      commentBody = buildCommentBody(svgContent.trim(), 'svg');
    } else {
      console.error('Error: One of --image, --svg, --image-url, or --stdin is required');
      printUsage();
      process.exit(1);
    }

    // Validate content
    if (!commentBody.trim()) {
      console.error('Error: Content is empty');
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
    await github.postComment(args.prNumber, commentBody, args.tag);

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
