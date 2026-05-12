#!/usr/bin/env bun
/**
 * `@ts-expect-error` / `@ts-ignore` / `@ts-nocheck` are escape hatches
 * with a half-life. They tend to ossify: the original blocker is fixed
 * upstream, the directive stays, and nobody knows whether removing it
 * is safe. The convention here: every directive carries a deadline
 * marker `until=YYYY-MM-DD` plus a reason, so we can grep for stale
 * ones and a future revisit is a non-decision (the date is past, the
 * line dies).
 *
 * Today the repo has zero directives — this lint locks that in.
 *
 * Allowed shapes:
 *   // @ts-expect-error until=2026-08-01 — kubb plugin type lag, drop after upstream PR #42
 *   /* @ts-expect-error until=2026-08-01 — same as above *\/
 *
 * Forbidden:
 *   - `@ts-nocheck` outright (file-level escape; never)
 *   - directive without `until=YYYY-MM-DD`
 *   - past-due `until=` (deadline is informational only if not enforced)
 *
 * Run: bun run scripts/lint-ts-directives.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const ROOTS = ['src', 'scripts', 'test'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'generated']);

const NOCHECK_RE = /@ts-nocheck\b/;
const DIRECTIVE_RE = /@ts-(?:expect-error|ignore)\b([^\n]*)/g;
const UNTIL_RE = /until=(\d{4})-(\d{2})-(\d{2})\b/;

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
    else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) yield full;
  }
}

type Offense = { file: string; line: number; reason: string };
const offenses: Offense[] = [];
const today = new Date();
const todayYmd = today.toISOString().slice(0, 10);

for (const r of ROOTS) {
  for (const file of walk(join(ROOT, r))) {
    const rel = relative(ROOT, file);
    if (rel === 'scripts/lint-ts-directives.ts') continue;
    const src = readFileSync(file, 'utf8');

    if (NOCHECK_RE.test(src)) {
      const idx = src.search(NOCHECK_RE);
      const line = src.slice(0, idx).split('\n').length;
      offenses.push({
        file: rel,
        line,
        reason: '@ts-nocheck is forbidden (file-level escape)',
      });
    }

    DIRECTIVE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
    while ((m = DIRECTIVE_RE.exec(src)) !== null) {
      const tail = m[1];
      const line = src.slice(0, m.index).split('\n').length;
      const untilMatch = tail.match(UNTIL_RE);
      if (!untilMatch) {
        offenses.push({
          file: rel,
          line,
          reason: 'missing `until=YYYY-MM-DD` deadline marker',
        });
        continue;
      }
      const deadline = `${untilMatch[1]}-${untilMatch[2]}-${untilMatch[3]}`;
      if (deadline < todayYmd) {
        offenses.push({
          file: rel,
          line,
          reason: `deadline ${deadline} is past (today is ${todayYmd}) — fix the underlying issue or extend the date with new justification`,
        });
      }
    }
  }
}

if (offenses.length === 0) {
  console.log('lint-ts-directives: 0 violations');
  process.exit(0);
}
console.error(`lint-ts-directives: ${offenses.length} violation(s):`);
for (const o of offenses) console.error(`  ${o.file}:${o.line}  ${o.reason}`);
console.error(
  '\nFormat: `// @ts-expect-error until=YYYY-MM-DD — reason`. ' +
    'No @ts-nocheck. No bare directives without a deadline.',
);
process.exit(1);
