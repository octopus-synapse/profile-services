#!/usr/bin/env bun
/**
 * P0-010 / Q37: every cron- or queue-driven worker wraps its body with
 *
 *   - `runGuardedJob({ name, expectedDurationMs, failureMode, lock, logger }, fn)`
 *     for cron workers (distributed lock + failure-mode declaration), or
 *   - `runWithFailureMode({ worker, logger }, mode, fn)` for queue
 *     consumers (BullMQ already de-dupes via jobId).
 *
 * The convention matters because the wrappers are what makes
 * multi-instance deploys safe (cron) and gives uniform error logging
 * + explicit failure-mode declaration (both). A `*.worker.ts` that
 * runs raw business logic in its `run()` method is the antipattern.
 *
 * The lint applies to every file named `*.worker.ts` under `src/`. It
 * requires at least one mention of `runGuardedJob` or `runWithFailureMode`
 * in the file body. If the worker is a thin shell that delegates to a
 * service which itself wraps, mark the worker file with
 * `// lint-allow-no-wrapper: <reason>` near the top.
 *
 * Run: bun run scripts/lint-cron-wrapper.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');

const WRAPPER_RE = /\b(?:runGuardedJob|runWithFailureMode)\s*\(/;
const ESCAPE_RE = /lint-allow-no-wrapper:\s*\S/;

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const full = join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) yield* walk(full);
    else if (entry.endsWith('.worker.ts') && !entry.endsWith('.spec.ts')) yield full;
  }
}

const offenses: string[] = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  if (ESCAPE_RE.test(src.slice(0, 800))) continue;
  if (!WRAPPER_RE.test(src)) offenses.push(rel);
}

if (offenses.length === 0) {
  console.log('lint-cron-wrapper: 0 violations');
  process.exit(0);
}
console.error(`lint-cron-wrapper: ${offenses.length} worker(s) missing the guard wrapper:`);
for (const f of offenses) console.error(`  ${f}`);
console.error(
  '\nWrap the worker body with `runGuardedJob({...}, async () => {...})` (cron) or ' +
    '`runWithFailureMode({...}, mode, async () => {...})` (queue). ' +
    'See `shared-kernel/jobs/run-guarded-job.ts`.',
);
process.exit(1);
