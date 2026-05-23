#!/usr/bin/env bun
/**
 * Forbids `.passthrough()` on Zod schemas in HTTP boundary code —
 * `*.routes.ts`, `*.routes.schemas.ts`, and webhook handlers. The
 * default `.strip()` silently drops unknown fields; `.passthrough()`
 * forwards them, opening the door to mass-assignment when the parsed
 * shape flows into a Prisma `create` / `update` or any
 * automatically-mapped DTO consumer.
 *
 * For webhooks specifically, the rule is even stricter — `.strict()`
 * is preferred so a provider adding a new field surfaces as an error
 * instead of being silently consumed.
 *
 * Run:
 *   bun run scripts/lint-no-passthrough.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'testing', '__mocks__']);

const TARGET_SUFFIXES = ['.routes.ts', '.routes.schemas.ts', '.webhook.handler.ts'];
const PATH_HINTS = [/\/webhooks?\//i];

const PATTERN = /\.passthrough\s*\(\s*\)/;

// Inline escape hatch. Same-line comment `// lint-allow-passthrough: <reason>`
// suppresses the rule for that line. The reason is required so the
// allowance is debatable in code review and traceable in git blame.
const ESCAPE = /\/\/\s*lint-allow-passthrough:\s*\S/;

interface Offender {
  readonly path: string;
  readonly line: number;
  readonly snippet: string;
}

function isTarget(abs: string): boolean {
  if (TARGET_SUFFIXES.some((s) => abs.endsWith(s))) return true;
  return PATH_HINTS.some((p) => p.test(abs));
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    if (entry.endsWith('.spec.ts') || entry.endsWith('.test.ts')) continue;
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      walk(abs, acc);
    } else if (entry.endsWith('.ts') && isTarget(abs)) {
      acc.push(abs);
    }
  }
  return acc;
}

const offenders: Offender[] = [];
for (const file of walk(SRC)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!PATTERN.test(lines[i])) continue;
    if (ESCAPE.test(lines[i])) continue;
    offenders.push({
      path: relative(ROOT, file),
      line: i + 1,
      snippet: lines[i].trim(),
    });
  }
}

if (offenders.length === 0) {
  console.log('lint-no-passthrough: 0 violations.');
  process.exit(0);
}

console.error(`lint-no-passthrough: ${offenders.length} violation(s):`);
for (const o of offenders) {
  console.error(`  ${o.path}:${o.line}  ${o.snippet}`);
}
console.error('\n`.passthrough()` silently forwards unknown fields — mass-assignment vector.');
console.error('Use `.strip()` (default) for routes, `.strict()` for webhooks.');
process.exit(1);
