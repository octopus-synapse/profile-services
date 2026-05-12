#!/usr/bin/env bun
/**
 * Top-level `let` / `var` in `src/` is module-singleton state. It
 * survives across requests, leaks between tests, breaks HMR, and
 * usually masks a missing dependency injection. The convention here:
 *
 *   - Module-level bindings are `const` always.
 *   - State lives in a class / service / adapter that the composition
 *     root owns and the test harness can reset.
 *
 * Exceptions (path-based):
 *   - `*\/testing/` directories — in-memory test doubles use mutable
 *     counters by design (the harness drops & re-imports them).
 *   - `*.composition.ts` / `*.config.ts` / `*.module.ts` — wiring-only
 *     files; if they really need mutable state, the lint escape below
 *     forces a justification.
 *
 * Inline escape (anywhere in the file): `// lint-allow-mutable-module-state: <reason>`.
 * Reserve for genuine monotonic counters used as opaque IDs
 * (e.g. socket-id generator). Use sparingly.
 *
 * Run: bun run scripts/lint-no-mutable-module-state.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');

const DECL_RE = /^(let|var)\s+([a-zA-Z_$][\w$]*)/gm;
const ESCAPE_RE = /lint-allow-mutable-module-state:\s*\S/;
const PATH_SKIP = /\/(?:testing|__tests__|__mocks__)\//;
const FILE_SKIP_SUFFIX = ['.composition.ts', '.config.ts', '.module.ts'];

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

type Offense = { file: string; line: number; decl: string };
const offenses: Offense[] = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  if (PATH_SKIP.test(`/${rel}/`)) continue;
  if (FILE_SKIP_SUFFIX.some((s) => rel.endsWith(s))) continue;
  const src = readFileSync(file, 'utf8');
  if (ESCAPE_RE.test(src)) continue;

  DECL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
  while ((m = DECL_RE.exec(src)) !== null) {
    const lineNum = src.slice(0, m.index).split('\n').length;
    offenses.push({ file: rel, line: lineNum, decl: `${m[1]} ${m[2]}` });
  }
}

if (offenses.length === 0) {
  console.log('lint-no-mutable-module-state: 0 violations');
  process.exit(0);
}
console.error(`lint-no-mutable-module-state: ${offenses.length} violation(s):`);
for (const o of offenses) console.error(`  ${o.file}:${o.line}  ${o.decl}`);
console.error(
  '\nUse `const`. Move state into a class/adapter the composition root owns. ' +
    'If this is a genuine monotonic counter (e.g. opaque socket ID), add ' +
    '`// lint-allow-mutable-module-state: <reason>` somewhere in the file.',
);
process.exit(1);
