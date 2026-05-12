#!/usr/bin/env bun
/**
 * `it.skip` / `test.skip` / `describe.skip` / `it.todo` / `test.todo`
 * are escape hatches with the same half-life problem as `@ts-expect-error`
 * (see `lint-ts-directives.ts`). Without a marker they accumulate
 * silently — the test that was disabled for "5 minutes during a
 * refactor" is still off three releases later.
 *
 * Convention: every skip/todo carries either
 *
 *   - `until=YYYY-MM-DD` somewhere on the same line or the line above
 *     (this is the default — the date itself is the revisit trigger), or
 *   - `// lint-allow-skip: <reason>` for genuinely indefinite gating
 *     (e.g. contract probes that activate on DRIFT_BASE_URL).
 *
 * Baseline-ratchet: existing occurrences are grandfathered via the
 * count in `lint-skip-todo-deadline.baseline.txt`. The lint fails if
 * total exceeds baseline OR any *new* call lacks a marker. Use
 * `UPDATE_BASELINE=1 bun run scripts/lint-skip-todo-deadline.ts` to
 * recapture the count after legitimately removing some.
 *
 * Conditional ternaries like `cond ? describe : describe.skip` are NOT
 * matched (the regex requires `(` after the directive), since those
 * express runtime gating rather than laziness.
 *
 * Run: bun run scripts/lint-skip-todo-deadline.ts
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const ROOTS = ['src', 'test'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'generated']);
const BASELINE_PATH = resolve(ROOT, 'scripts/lint-skip-todo-deadline.baseline.txt');

const DIRECTIVE_RE = /\b(?:it|test|describe)\.(?:skip|todo)\s*\(/g;
const UNTIL_RE = /until=(\d{4})-(\d{2})-(\d{2})\b/;
const ESCAPE_RE = /lint-allow-skip:\s*\S/;

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.') || SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) yield* walk(full);
    else if (entry.endsWith('.spec.ts') || entry.endsWith('.test.ts')) yield full;
  }
}

type Site = { file: string; line: number; marked: boolean; pastDue: boolean };
const sites: Site[] = [];
const today = new Date().toISOString().slice(0, 10);

for (const r of ROOTS) {
  for (const file of walk(join(ROOT, r))) {
    const rel = relative(ROOT, file);
    const src = readFileSync(file, 'utf8');
    const lines = src.split('\n');
    DIRECTIVE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
    while ((m = DIRECTIVE_RE.exec(src)) !== null) {
      const lineNum = src.slice(0, m.index).split('\n').length;
      const here = lines[lineNum - 1] || '';
      const above = lines[lineNum - 2] || '';
      const text = `${above}\n${here}`;
      const hasEscape = ESCAPE_RE.test(text);
      const untilMatch = text.match(UNTIL_RE);
      const marked = hasEscape || untilMatch !== null;
      const pastDue =
        untilMatch !== null && `${untilMatch[1]}-${untilMatch[2]}-${untilMatch[3]}` < today;
      sites.push({ file: rel, line: lineNum, marked, pastDue });
    }
  }
}

const total = sites.length;
const unmarked = sites.filter((s) => !s.marked);
const pastDue = sites.filter((s) => s.pastDue);

if (process.env.UPDATE_BASELINE === '1') {
  writeFileSync(BASELINE_PATH, `${total}\n`);
  console.log(`[skip-todo-deadline] baseline updated to ${total}`);
  process.exit(0);
}
const baseline = existsSync(BASELINE_PATH) ? Number(readFileSync(BASELINE_PATH, 'utf8').trim()) : 0;

let failed = false;
if (total > baseline) {
  console.error(
    `lint-skip-todo-deadline: regression — ${total - baseline} new occurrence(s). ` +
      `Total ${total} (baseline ${baseline}).`,
  );
  failed = true;
}
if (unmarked.length > 0 && total > baseline) {
  console.error(`Unmarked skip/todo without \`until=YYYY-MM-DD\` or \`lint-allow-skip:\`:`);
  for (const s of unmarked) console.error(`  ${s.file}:${s.line}`);
  failed = true;
}
if (pastDue.length > 0) {
  console.error('Past-due skip/todo deadlines (fix the test or extend the date):');
  for (const s of pastDue) console.error(`  ${s.file}:${s.line}`);
  failed = true;
}

if (failed) {
  console.error(
    '\nMark with `until=YYYY-MM-DD` (per-test deadline) or `// lint-allow-skip: <reason>` ' +
      '(indefinite runtime gating, e.g. contract probes).',
  );
  process.exit(1);
}
console.log(
  `lint-skip-todo-deadline: ${total} occurrence(s) (baseline ${baseline}), all within budget`,
);
