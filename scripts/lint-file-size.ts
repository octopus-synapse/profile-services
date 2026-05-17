#!/usr/bin/env bun
/**
 * Cat 5 #3: source files >500 lines tend to be doing too much. The
 * cap is intentionally a soft signal (some routes/composition files
 * legitimately accumulate registrations), so this lint is
 * baseline-ratchet: capture today's count of >500-line files, fail
 * when the count rises OR when an existing offender grows.
 *
 * The baseline records `<path>\t<lines>` per offender so we can detect
 * both (a) new offenders and (b) growth in existing offenders.
 * `UPDATE_BASELINE=1` recaptures after a sweep.
 *
 * Scope: `src/**\/*.ts` excluding specs/tests/generated. Files that
 * legitimately can't shrink (e.g. an enum module or a route registry
 * by design) can carry `// lint-allow-file-size: <reason>` near the
 * top to be skipped entirely.
 *
 * Run: bun run scripts/lint-file-size.ts
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');
const LIMIT = 500;
const BASELINE_PATH = resolve(ROOT, 'scripts/lint-file-size.baseline.txt');
const ESCAPE_RE = /lint-allow-file-size:\s*\S/;

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'node_modules' || entry === 'generated') continue;
    const full = join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) yield* walk(full);
    else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts') && !entry.endsWith('.test.ts'))
      yield full;
  }
}

const current = new Map<string, number>();
for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8');
  if (ESCAPE_RE.test(src.slice(0, 800))) continue;
  const lines = src.split('\n').length;
  if (lines > LIMIT) current.set(relative(ROOT, file), lines);
}

const baselineEntries = (): Map<string, number> => {
  if (!existsSync(BASELINE_PATH)) return new Map();
  const out = new Map<string, number>();
  for (const row of readFileSync(BASELINE_PATH, 'utf8').split('\n')) {
    const trimmed = row.trim();
    if (!trimmed) continue;
    const [path, nStr] = trimmed.split('\t');
    if (path && nStr) out.set(path, Number(nStr));
  }
  return out;
};

if (process.env.UPDATE_BASELINE === '1') {
  const lines = [...current.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([p, n]) => `${p}\t${n}`);
  writeFileSync(BASELINE_PATH, `${lines.join('\n')}\n`);
  console.log(`[file-size] baseline updated to ${current.size} file(s)`);
  process.exit(0);
}

const baseline = baselineEntries();
const newOffenders: string[] = [];
const grown: string[] = [];
for (const [path, n] of current) {
  const prior = baseline.get(path);
  if (prior === undefined) newOffenders.push(`${path} (${n} lines)`);
  else if (n > prior) grown.push(`${path} (${prior} → ${n} lines)`);
}

if (newOffenders.length === 0 && grown.length === 0) {
  console.log(`lint-file-size: ${current.size} file(s) over ${LIMIT} (matches baseline)`);
  process.exit(0);
}

if (newOffenders.length > 0) {
  console.error(`lint-file-size: ${newOffenders.length} new file(s) over ${LIMIT} lines:`);
  for (const o of newOffenders) console.error(`  ${o}`);
}
if (grown.length > 0) {
  console.error(`lint-file-size: ${grown.length} existing offender(s) grew:`);
  for (const o of grown) console.error(`  ${o}`);
}
console.error(
  `\nSplit the file, extract sub-modules, or — if the size is intrinsic — ` +
    `add \`// lint-allow-file-size: <reason>\` near the top.`,
);
process.exit(1);
