#!/usr/bin/env bun
/**
 * Q31: every `@deprecated` JSDoc tag must carry an `@removeBy YYYY-MM-DD`
 * sibling tag (and optionally a reason). Without a removal date, a
 * `@deprecated` accumulates indefinitely — the warning becomes noise
 * and nobody knows whether removing the symbol is safe.
 *
 * Rule: in any `.ts` file under `src/`, every `@deprecated` JSDoc must
 * have a matching `@removeBy <ISO date>` within the same JSDoc block
 * (the next ~12 lines after the `@deprecated`). The date must parse
 * as ISO `YYYY-MM-DD`. Past-due dates also fail.
 *
 * The 4 existing `@deprecated` markers already comply
 * (`@removeBy 2026-08-31`) — locking that in.
 *
 * Inline escape: `// lint-allow-no-removeby: <reason>` on the same line
 * as the `@deprecated` tag (for genuinely indefinite deprecations like
 * "kept until external integration X retires" — rare).
 *
 * Run: bun run scripts/lint-deprecated-removeby.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');

const DEPRECATED_RE = /@deprecated\b/g;
const REMOVE_BY_RE = /@removeBy\s+(\d{4})-(\d{2})-(\d{2})\b/;
const ESCAPE_RE = /lint-allow-no-removeby:\s*\S/;

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

type Offense = { file: string; line: number; reason: string };
const offenses: Offense[] = [];
const today = new Date().toISOString().slice(0, 10);

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  DEPRECATED_RE.lastIndex = 0;
  for (
    let m: RegExpExecArray | null = DEPRECATED_RE.exec(src);
    m !== null;
    m = DEPRECATED_RE.exec(src)
  ) {
    const lineNum = src.slice(0, m.index).split('\n').length;
    if (ESCAPE_RE.test(lines[lineNum - 1] || '')) continue;

    // Look at the next 12 lines for the JSDoc closing or @removeBy.
    const window = lines.slice(lineNum - 1, lineNum + 12).join('\n');
    const stopAt = window.indexOf('*/');
    const scopeText = stopAt === -1 ? window : window.slice(0, stopAt);
    const rb = scopeText.match(REMOVE_BY_RE);
    if (!rb) {
      offenses.push({
        file: rel,
        line: lineNum,
        reason: 'missing `@removeBy YYYY-MM-DD` in the same JSDoc block',
      });
      continue;
    }
    const date = `${rb[1]}-${rb[2]}-${rb[3]}`;
    if (date < today) {
      offenses.push({
        file: rel,
        line: lineNum,
        reason: `@removeBy ${date} is past (today ${today}) — finish the migration or extend the date with new justification`,
      });
    }
  }
}

if (offenses.length === 0) {
  console.log('lint-deprecated-removeby: 0 violations');
  process.exit(0);
}
console.error(`lint-deprecated-removeby: ${offenses.length} violation(s):`);
for (const o of offenses) console.error(`  ${o.file}:${o.line}  ${o.reason}`);
console.error(
  '\nEvery `@deprecated` JSDoc tag needs a `@removeBy YYYY-MM-DD` sibling so the symbol has a built-in revisit date.',
);
process.exit(1);
