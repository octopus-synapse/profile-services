#!/usr/bin/env bun
/**
 * CLI: Generate CI Card
 *
 * Generates SVG card from attestation and CI metrics.
 *
 * Usage:
 *   bun generate-card.ts --attestation=.attestation [--ci-metrics=ci.json]
 *   echo '{"attestation":{...},"ci":{...},"git":{...}}' | bun generate-card.ts --stdin
 *
 * Output:
 *   SVG string to stdout
 */

import { z } from 'zod';
import { generateCard, generateMarkdownCard } from '../domain/card';
import { aggregateMetrics } from '../domain/metrics';
import type { AttestationData, CIMetrics, GitContext } from '../domain/types';
import { createFileReader } from '../infrastructure/file-reader';
import { createGitClient } from '../infrastructure/git-client';

// =============================================================================
// Input Schemas
// =============================================================================

const CheckMetricsSchema = z.object({
  status: z.string(),
  time_ms: z.number(),
  passed: z.number().optional(),
  failed: z.number().optional(),
  skipped: z.number().optional(),
});

const AttestationSchema = z.object({
  version: z.string().optional().default('1.0.0'),
  tree_hash: z.string().optional().default(''),
  checks: z.string().optional().default(''),
  metrics: z.object({
    swagger: CheckMetricsSchema.optional(),
    typecheck: CheckMetricsSchema.optional(),
    lint: CheckMetricsSchema.optional(),
    unit: CheckMetricsSchema.optional(),
    arch: CheckMetricsSchema.optional(),
    contracts: CheckMetricsSchema.optional(),
  }),
  timestamp: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
  git_user: z.string().optional().default(''),
});

const CIJobSchema = z.object({
  status: z.enum(['success', 'fail', 'running', 'pending', 'skip']),
  duration_ms: z.number(),
  passed: z.number().optional(),
  failed: z.number().optional(),
  skipped: z.number().optional(),
  suites: z.number().optional(),
});

const CIMetricsSchema = z.object({
  build: CIJobSchema.optional().default({ status: 'pending', duration_ms: 0 }),
  integration: CIJobSchema.optional().default({ status: 'pending', duration_ms: 0 }),
  e2e: CIJobSchema.optional().default({ status: 'pending', duration_ms: 0 }),
  security: CIJobSchema.optional().default({ status: 'pending', duration_ms: 0 }),
});

const GitContextSchema = z.object({
  commit_hash: z.string(),
  commit_message: z.string(),
  commit_author: z.string(),
  co_authors: z.array(z.string()).optional().default([]),
  branch: z.string(),
  run_number: z.number().optional().default(0),
  timestamp: z
    .string()
    .optional()
    .default(() => `${new Date().toISOString().slice(11, 16)} UTC`),
});

const StdinInputSchema = z.object({
  attestation: AttestationSchema,
  ci: CIMetricsSchema.optional(),
  git: GitContextSchema,
});

// =============================================================================
// CLI Implementation
// =============================================================================

function printUsage(): void {
  console.error('Usage: generate-card --attestation=<path> [--ci-metrics=<path>]');
  console.error('       generate-card --stdin');
  console.error('');
  console.error('Options:');
  console.error('  --attestation=<path>  Path to attestation JSON file');
  console.error('  --ci-metrics=<path>   Path to CI metrics JSON file (optional)');
  console.error('  --stdin               Read all data from stdin as JSON');
  console.error('');
  console.error('Stdin JSON schema:');
  console.error('  {');
  console.error('    "attestation": {...},');
  console.error('    "ci": {...},');
  console.error('    "git": { "commit_hash", "commit_message", "commit_author", "branch" }');
  console.error('  }');
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function parseArgs(): {
  attestationPath?: string;
  ciMetricsPath?: string;
  stdin: boolean;
  format: 'svg' | 'markdown';
} {
  const args = process.argv.slice(2);
  const result = {
    attestationPath: undefined as string | undefined,
    ciMetricsPath: undefined as string | undefined,
    stdin: false,
    format: 'markdown' as 'svg' | 'markdown', // Default to markdown for GitHub compatibility
  };

  for (const arg of args) {
    if (arg === '--stdin') {
      result.stdin = true;
    } else if (arg.startsWith('--attestation=')) {
      result.attestationPath = arg.replace('--attestation=', '');
    } else if (arg.startsWith('--ci-metrics=')) {
      result.ciMetricsPath = arg.replace('--ci-metrics=', '');
    } else if (arg === '--format=svg') {
      result.format = 'svg';
    } else if (arg === '--format=markdown' || arg === '--format=md') {
      result.format = 'markdown';
    }
  }

  return result;
}

async function main(): Promise<void> {
  try {
    const args = parseArgs();

    let attestation: AttestationData;
    let ci: CIMetrics;
    let git: GitContext;

    if (args.stdin) {
      // Read all data from stdin
      const rawInput = await readStdin();
      const jsonInput = JSON.parse(rawInput.trim());
      const input = StdinInputSchema.parse(jsonInput);

      attestation = input.attestation as AttestationData;
      ci = (input.ci ?? {
        build: { status: 'pending', duration_ms: 0 },
        integration: { status: 'pending', duration_ms: 0 },
        e2e: { status: 'pending', duration_ms: 0 },
        security: { status: 'pending', duration_ms: 0 },
      }) as CIMetrics;
      git = input.git as GitContext;
    } else if (args.attestationPath) {
      // Read from files
      const fileReader = createFileReader();
      const gitClient = createGitClient();

      attestation = await fileReader.readAttestation(args.attestationPath);

      if (args.ciMetricsPath) {
        ci = await fileReader.readCIMetrics(args.ciMetricsPath);
      } else {
        ci = {
          build: { status: 'pending', duration_ms: 0 },
          integration: { status: 'pending', duration_ms: 0 },
          e2e: { status: 'pending', duration_ms: 0 },
          security: { status: 'pending', duration_ms: 0 },
        };
      }

      git = await gitClient.getCommitInfo();
    } else {
      printUsage();
      process.exit(1);
    }

    // Aggregate metrics and generate card
    const metrics = aggregateMetrics(attestation, ci);
    const cardData = { metrics, git };

    const output = args.format === 'svg' ? generateCard(cardData) : generateMarkdownCard(cardData);

    console.log(output);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', JSON.stringify(error.flatten().fieldErrors, null, 2));
    } else if (error instanceof SyntaxError) {
      console.error('Invalid JSON input');
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

main();
