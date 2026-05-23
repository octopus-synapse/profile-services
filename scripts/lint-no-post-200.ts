#!/usr/bin/env bun
/**
 * Flags `statusCode: 200` on POST handlers — the Elysia mounter
 * auto-201 convention. Eighteen handlers today legitimately return
 * 200 (login, verify-email, refresh-token, ack-style ops that don't
 * create resources). Rather than allowlist each, this lint uses a
 * baseline ratchet: existing count is captured, CI fails on regression,
 * and the floor moves down via `--update-baseline`.
 *
 * The intent isn't to drive the count to zero — POST-200 has real
 * REST semantics for non-creating actions — but to make new uses
 * deliberate. Anyone adding a POST 200 must justify it in code review
 * (and bump the baseline by hand).
 *
 * Run: bun run scripts/lint-no-post-200.ts
 *      bun run scripts/lint-no-post-200.ts --update-baseline
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'testing', '__mocks__']);
const BASELINE_PATH = resolve(ROOT, 'scripts/lint-no-post-200.baseline.txt');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    if (entry.endsWith('.spec.ts') || entry.endsWith('.test.ts')) continue;
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) walk(abs, acc);
    else if (entry.endsWith('.routes.ts')) acc.push(abs);
  }
  return acc;
}

const offenders: Array<{ path: string; line: number; snippet: string }> = [];
for (const file of walk(SRC)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/method:\s*['"]POST['"]/.test(lines[i])) continue;
    const window = lines.slice(i, Math.min(i + 30, lines.length));
    for (let j = 0; j < window.length; j++) {
      const w = window[j];
      if (!/statusCode:\s*200\b/.test(w)) continue;
      offenders.push({
        path: relative(ROOT, file),
        line: i + j + 1,
        snippet: w.trim(),
      });
      break;
    }
  }
}

const total = offenders.length;
const updateBaseline = process.argv.includes('--update-baseline');

if (updateBaseline) {
  writeFileSync(BASELINE_PATH, `${total}\n`);
  console.log(`[lint-no-post-200] baseline updated to ${total}`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH) ? Number(readFileSync(BASELINE_PATH, 'utf8').trim()) : 0;

console.log(`[lint-no-post-200] ${total} callsite(s) (baseline ${baseline})`);

if (total > baseline) {
  console.error(`[lint-no-post-200] regression: ${total - baseline} new POST returning 200`);
  console.error('POST handlers should let the mounter auto-201 unless there is a REST reason.');
  console.error('\nIf the new POST genuinely returns 200 (idempotent / non-creating), justify in');
  console.error('the PR and run `--update-baseline` to lock in the new floor.');
  for (const o of offenders) console.error(`  ${o.path}:${o.line}  ${o.snippet}`);
  process.exit(1);
}
