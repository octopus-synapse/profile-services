#!/usr/bin/env bun
/**
 * Clean architecture invariant: `application/use-cases/` and `domain/`
 * are framework-free POJOs. Reaching for `process.env.*` directly
 * breaks that — environment access belongs to the composition root
 * (`*.composition.ts`) and the `ConfigPort` it injects into use cases.
 *
 * The narrow rule: `process.env.*` is forbidden in any file under
 *
 *   src/bounded-contexts/**\/application/use-cases/**\/*.ts
 *   src/bounded-contexts/**\/domain/**\/*.ts
 *   src/shared-kernel/domain/**\/*.ts            (if it ever exists)
 *
 * Composition roots, adapters, infrastructure, and bootstrap are out
 * of scope — they're the layers that legitimately bind the wiring.
 *
 * Comments mentioning `process.env` (e.g. "use ConfigPort, not
 * process.env") don't trigger — the regex requires an actual
 * property access (`process.env.<NAME>`).
 *
 * Inline escape `// lint-allow-process-env: <reason>` (never expected
 * to be needed in this layer).
 *
 * Run: bun run scripts/lint-no-process-env-in-domain.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');

const FORBIDDEN_PATH_RE = /\/(?:application\/use-cases|domain)\//;
const ACCESS_RE = /\bprocess\.env\.[A-Z_]/g;
const COMMENT_LINE_RE = /^\s*(?:\/\/|\*\s|\*\/|\/\*)/;
const ESCAPE_RE = /lint-allow-process-env:\s*\S/;

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

type Offense = { file: string; line: number };
const offenses: Offense[] = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  if (!FORBIDDEN_PATH_RE.test(`/${rel}`)) continue;
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (COMMENT_LINE_RE.test(line)) continue;
    if (ESCAPE_RE.test(line)) continue;
    ACCESS_RE.lastIndex = 0;
    if (ACCESS_RE.test(line)) offenses.push({ file: rel, line: i + 1 });
  }
}

if (offenses.length === 0) {
  console.log('lint-no-process-env-in-domain: 0 violations');
  process.exit(0);
}
console.error(`lint-no-process-env-in-domain: ${offenses.length} violation(s):`);
for (const o of offenses) console.error(`  ${o.file}:${o.line}`);
console.error(
  '\n`application/use-cases/` and `domain/` are framework-free POJOs. ' +
    'Inject `ConfigPort` from the composition root instead of reading `process.env` directly.',
);
process.exit(1);
