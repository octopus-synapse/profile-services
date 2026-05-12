#!/usr/bin/env bun
/**
 * E2E specs hit a real Postgres + Redis + (often) S3 + queue. Without
 * an explicit cleanup hook, every CI run leaks rows / cache entries /
 * objects until the test DB is too dirty to trust. The convention
 * for `test/infrastructure/e2e/**\/*.spec.ts`:
 *
 *   - any spec that touches DB-provisioning helpers
 *     (`freshContext`, `freshInDb*`, `createTestApp`, raw `prisma.*`)
 *     MUST declare at least one `afterAll(` or `afterEach(` hook
 *     somewhere in the file. The hook is where teardown lives.
 *
 * False positives are minimized by only checking specs that actually
 * use a DB-provisioning helper — purely synchronous e2e probes (no
 * DB touch) are exempt.
 *
 * Inline escape `// lint-allow-no-cleanup: <reason>` at the top of
 * the file for genuine cases (read-only probes, contract-only specs).
 *
 * Run: bun run scripts/lint-e2e-cleanup.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const E2E = join(ROOT, 'test/infrastructure/e2e');

const PROVISIONING_RE =
  /\b(?:freshContext|freshInDb[A-Z]\w*|createTestApp|prisma\.[a-z]\w+\.(?:create|createMany|deleteMany|update|updateMany))\s*\(/;
const HOOK_RE = /\b(?:afterAll|afterEach)\s*\(/;
const ESCAPE_RE = /lint-allow-no-cleanup:\s*\S/;

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
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

const offenses: string[] = [];
for (const file of walk(E2E)) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  if (ESCAPE_RE.test(src.slice(0, 500))) continue;
  if (!PROVISIONING_RE.test(src)) continue;
  if (!HOOK_RE.test(src)) offenses.push(rel);
}

if (offenses.length === 0) {
  console.log('lint-e2e-cleanup: 0 violations');
  process.exit(0);
}
console.error(
  `lint-e2e-cleanup: ${offenses.length} e2e spec(s) provision DB but declare no after* hook:`,
);
for (const f of offenses) console.error(`  ${f}`);
console.error(
  '\nAdd an `afterAll(...)` or `afterEach(...)` that tears down the rows/objects this spec creates, ' +
    'or escape with `// lint-allow-no-cleanup: <reason>` at the top of the file.',
);
process.exit(1);
