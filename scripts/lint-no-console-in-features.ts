#!/usr/bin/env bun
/**
 * Cat 5 #2: feature code uses `LoggerPort`, not `console.*`. The
 * exceptions are documented in `CLAUDE.md` (Q22):
 *
 *   - `bounded-contexts/platform/common/logger/logger.service.ts` —
 *     Winston falls back to raw console for its own self-protection.
 *   - Seed runners + translation bootstrap use `ConsoleLoggerAdapter`.
 *
 * Today there are zero `console.<method>(` calls in feature code
 * outside those paths — locking that in. The Biome rule `noConsole`
 * is configured at "warn" upstream; this script enforces error level
 * for the scopes that matter without touching the shared config.
 *
 * Scope: `src/bounded-contexts/**` + `src/shared-kernel/**`,
 * excluding the documented exception paths.
 *
 * Inline escape `// lint-allow-console: <reason>` on the same line.
 *
 * Run: bun run scripts/lint-no-console-in-features.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const ROOTS = ['src/bounded-contexts', 'src/shared-kernel'];

const ALLOWED_PATHS = new Set<string>([
  // Winston self-protection fallback.
  'src/bounded-contexts/platform/common/logger/logger.service.ts',
  // ConsoleLoggerAdapter is the documented console-using adapter.
  'src/bounded-contexts/platform/common/logger/adapters/console-logger.adapter.ts',
]);

const ALLOWED_PATH_REGEXES: RegExp[] = [
  // Seed runners (CLI-only, no logger available).
  /\/seeds?\//,
  // Translation bootstrap.
  /\/translation\/.*bootstrap/i,
  // Test infrastructure.
  /\/__tests__\//,
  /\/__mocks__\//,
  /\/testing\//,
];

const CALL_RE =
  /\bconsole\.(?:log|debug|info|warn|error|trace|dir|table|group|groupEnd|time|timeEnd|assert)\s*\(/g;
const ESCAPE_RE = /lint-allow-console:\s*\S/;

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

type Offense = { file: string; line: number };
const offenses: Offense[] = [];

for (const r of ROOTS) {
  for (const file of walk(join(ROOT, r))) {
    const rel = relative(ROOT, file);
    if (ALLOWED_PATHS.has(rel)) continue;
    if (ALLOWED_PATH_REGEXES.some((re) => re.test(`/${rel}`))) continue;
    const src = readFileSync(file, 'utf8');
    const lines = src.split('\n');
    CALL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
    while ((m = CALL_RE.exec(src)) !== null) {
      const lineNum = src.slice(0, m.index).split('\n').length;
      if (ESCAPE_RE.test(lines[lineNum - 1] || '')) continue;
      offenses.push({ file: rel, line: lineNum });
    }
  }
}

if (offenses.length === 0) {
  console.log('lint-no-console-in-features: 0 violations');
  process.exit(0);
}
console.error(`lint-no-console-in-features: ${offenses.length} violation(s):`);
for (const o of offenses) console.error(`  ${o.file}:${o.line}`);
console.error(
  '\nInject `LoggerPort` from `shared-kernel/logger`. The documented exceptions ' +
    '(Winston fallback, ConsoleLoggerAdapter, seed runners, translation bootstrap) are ' +
    'already path-allowlisted in this lint — see Q22 in `profile-services/CLAUDE.md`.',
);
process.exit(1);
