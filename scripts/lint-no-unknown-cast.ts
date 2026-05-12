#!/usr/bin/env bun
/**
 * Cat 2 #2: `as unknown as X` is the canonical bypass for `no-any` — it
 * silences the type checker without any runtime check. Sometimes it's
 * the right escape (event-bus heterogeneous handler registration,
 * Prisma `Json` columns parsed back to a typed shape, intentional
 * downcasting at a clearly-marked boundary), but more often it's a
 * shortcut around a real typing problem.
 *
 * The rule is baseline-ratchet: capture the current count of
 * `as unknown as X` casts in non-spec source code, fail when the
 * count goes up. Removals can recapture the baseline via
 * `UPDATE_BASELINE=1`.
 *
 * Spec files (`*.spec.ts` / `*.test.ts`) are exempt — `as unknown as
 * MockType` is the idiomatic way to type a partial test double and
 * fighting it is unproductive.
 *
 * Inline escape (counts towards the baseline but exempt from
 * regression accounting): `// lint-allow-unknown-cast: <reason>` on
 * the same line. Use only at adapter boundaries where the cast is
 * documented + reviewed.
 *
 * Run: bun run scripts/lint-no-unknown-cast.ts
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');
const BASELINE_PATH = resolve(ROOT, 'scripts/lint-no-unknown-cast.baseline.txt');

const CAST_RE = /\bas\s+unknown\s+as\b/g;
const ESCAPE_RE = /lint-allow-unknown-cast:\s*\S/;

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
    else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts') && !entry.endsWith('.test.ts'))
      yield full;
  }
}

type Site = { file: string; line: number; escaped: boolean };
const sites: Site[] = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  CAST_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
  while ((m = CAST_RE.exec(src)) !== null) {
    const lineNum = src.slice(0, m.index).split('\n').length;
    const escaped = ESCAPE_RE.test(lines[lineNum - 1] || '');
    sites.push({ file: rel, line: lineNum, escaped });
  }
}

const total = sites.length;

if (process.env.UPDATE_BASELINE === '1') {
  writeFileSync(BASELINE_PATH, `${total}\n`);
  console.log(`[no-unknown-cast] baseline updated to ${total}`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH) ? Number(readFileSync(BASELINE_PATH, 'utf8').trim()) : 0;

if (total > baseline) {
  const fresh = sites.filter((s) => !s.escaped);
  console.error(
    `lint-no-unknown-cast: regression — ${total - baseline} new occurrence(s). ` +
      `Total ${total} (baseline ${baseline}).`,
  );
  console.error(
    '\nFix the typing root cause, or escape the new line with ' +
      '`// lint-allow-unknown-cast: <reason>` if this is an audited adapter boundary.\n',
  );
  for (const s of fresh.slice(-20)) console.error(`  ${s.file}:${s.line}`);
  process.exit(1);
}
console.log(`lint-no-unknown-cast: ${total} occurrence(s) (baseline ${baseline}), within budget`);
