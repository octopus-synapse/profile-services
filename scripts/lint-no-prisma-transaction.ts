#!/usr/bin/env bun
/**
 * Forbids `prisma.$transaction(...)` outside `shared-kernel/persistence/`.
 * Use cases and repositories must call `runInTransaction(prisma, async
 * (tx) => ...)` instead — the wrapper preserves retry policy, integrates
 * with `PrismaLikeClient`, and lets tests inject a mock tx without
 * rewiring.
 *
 * Twelve callsites today predate this rule. Rather than allowlist each
 * inline (Q13-V3 marked them as migration path), this lint uses a
 * baseline ratchet: the current count is captured in
 * `scripts/lint-no-prisma-transaction.baseline.txt` and CI fails when
 * the count exceeds it. New callsites can never enter; migrations
 * monotonically reduce the baseline (run with `--update-baseline`).
 *
 * Run: bun run scripts/lint-no-prisma-transaction.ts
 *      bun run scripts/lint-no-prisma-transaction.ts --update-baseline
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'testing', '__mocks__']);
const ALLOWED_ROOT = 'src/shared-kernel/persistence';
const BASELINE_PATH = resolve(ROOT, 'scripts/lint-no-prisma-transaction.baseline.txt');

const PATTERN = /\b(?:prisma|this\.prisma|client|tx)\.\$transaction\s*\(/;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    if (entry.endsWith('.spec.ts') || entry.endsWith('.test.ts')) continue;
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) walk(abs, acc);
    else if (entry.endsWith('.ts')) acc.push(abs);
  }
  return acc;
}

const offenders: Array<{ path: string; line: number; snippet: string }> = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  if (rel.startsWith(ALLOWED_ROOT)) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (PATTERN.test(lines[i])) {
      offenders.push({ path: rel, line: i + 1, snippet: lines[i].trim() });
    }
  }
}

const total = offenders.length;
const updateBaseline = process.argv.includes('--update-baseline');

if (updateBaseline) {
  writeFileSync(BASELINE_PATH, `${total}\n`);
  console.log(`[lint-no-prisma-transaction] baseline updated to ${total}`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH) ? Number(readFileSync(BASELINE_PATH, 'utf8').trim()) : 0;

console.log(`[lint-no-prisma-transaction] ${total} callsite(s) (baseline ${baseline})`);

if (total > baseline) {
  console.error(`[lint-no-prisma-transaction] regression: ${total - baseline} new callsite(s)`);
  console.error(
    'Use `runInTransaction(prisma, async (tx) => ...)` from shared-kernel/persistence.',
  );
  console.error('\nNew offenders relative to baseline:');
  for (const o of offenders) console.error(`  ${o.path}:${o.line}  ${o.snippet}`);
  process.exit(1);
}

if (total < baseline) {
  console.log(
    `[lint-no-prisma-transaction] migration progress: ${baseline - total} callsite(s) removed`,
  );
  console.log('Run with --update-baseline to lock in the new floor.');
}
