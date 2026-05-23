/**
 * P2-089 — ratchet on `as unknown as X` double-casts in production
 * code. The legitimate uses (test fixtures, type-erased adapters
 * crossing a real type boundary) live in `*.spec.ts` and `/testing/`
 * and are excluded; everything else is a smell that the test suite
 * can stop creeping upward.
 *
 * Current baseline: count is captured the first time the script runs
 * and persisted in `scripts/check-double-casts.baseline.txt`. CI
 * fails when the count exceeds the baseline. Run the script with
 * `--update-baseline` after a deliberate reduction lands.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Glob } from 'bun';

const SRC_DIR = resolve('src');
const BASELINE_PATH = resolve('scripts/check-double-casts.baseline.txt');
const PATTERN = /as\s+unknown\s+as\s+/g;

async function main(): Promise<void> {
  const offenders: { file: string; count: number }[] = [];
  let total = 0;

  for await (const rel of new Glob('**/*.ts').scan({ cwd: SRC_DIR })) {
    if (rel.endsWith('.spec.ts') || rel.endsWith('.test.ts')) continue;
    if (rel.includes('/testing/')) continue;
    const src = readFileSync(resolve(SRC_DIR, rel), 'utf8');
    const matches = src.match(PATTERN);
    if (!matches) continue;
    offenders.push({ file: rel, count: matches.length });
    total += matches.length;
  }

  const update = process.argv.includes('--update-baseline');
  if (update) {
    writeFileSync(BASELINE_PATH, `${total}\n`);
    console.log(`[check-double-casts] baseline updated to ${total}`);
    return;
  }

  const baseline = existsSync(BASELINE_PATH)
    ? Number.parseInt(readFileSync(BASELINE_PATH, 'utf8').trim(), 10)
    : Number.POSITIVE_INFINITY;

  console.log(`[check-double-casts] ${total} double-casts (baseline ${baseline})`);
  if (total > baseline) {
    console.error(`[check-double-casts] regression: ${total - baseline} new double-cast(s)`);
    console.error('Top offenders:');
    for (const o of offenders.sort((a, b) => b.count - a.count).slice(0, 10)) {
      console.error(`  ${o.count.toString().padStart(3, ' ')}  ${o.file}`);
    }
    process.exit(1);
  }
}

void main();
