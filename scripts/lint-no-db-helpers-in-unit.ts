#!/usr/bin/env bun
/**
 * Unit specs live at `src/**\/*.spec.ts` and run in the in-memory
 * harness — no Postgres, no Redis, no BullMQ. The expensive DB
 * helpers (`freshContext`, `createTestApp`, the integration `setup.ts`,
 * etc.) live under `test/infrastructure/shared/` and force a real
 * connection.
 *
 * A unit spec that imports those helpers becomes accidentally an
 * integration spec: slow, racy under parallel runs, and silently
 * skipped when the test DB isn't running locally. Catch that here.
 *
 * Forbidden in `src/**\/*.spec.ts`:
 *   - any import from `test/infrastructure/...`
 *   - any import from `../test/infrastructure/...` / `@/test/infrastructure/...`
 *   - direct `@prisma/client` PrismaClient instantiation
 *   - direct `ioredis` / `bullmq` imports
 *
 * Inline escape `// lint-allow-db-in-unit: <reason>` on the import line.
 *
 * Run: bun run scripts/lint-no-db-helpers-in-unit.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+['"`](?:\.\.\/)+test\/infrastructure\//,
  /from\s+['"`]@\/test\/infrastructure\//,
  /from\s+['"`]test\/infrastructure\//,
  /from\s+['"`]ioredis['"`]/,
  /from\s+['"`]bullmq['"`]/,
];
const PRISMA_INSTANTIATE = /new\s+PrismaClient\s*\(/;
const ESCAPE = /lint-allow-db-in-unit:\s*\S/;

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
    else if (entry.endsWith('.spec.ts') || entry.endsWith('.test.ts')) yield full;
  }
}

type Offense = { file: string; line: number; reason: string };
const offenses: Offense[] = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (ESCAPE.test(line)) continue;
    for (const pat of FORBIDDEN_IMPORT_PATTERNS) {
      if (pat.test(line)) {
        offenses.push({
          file: rel,
          line: i + 1,
          reason: `forbidden import in unit spec: ${line.trim().slice(0, 80)}`,
        });
        break;
      }
    }
    if (PRISMA_INSTANTIATE.test(line)) {
      offenses.push({
        file: rel,
        line: i + 1,
        reason: 'direct `new PrismaClient(...)` — unit specs must not open DB connections',
      });
    }
  }
}

if (offenses.length === 0) {
  console.log('lint-no-db-helpers-in-unit: 0 violations');
  process.exit(0);
}
console.error(`lint-no-db-helpers-in-unit: ${offenses.length} violation(s):`);
for (const o of offenses) console.error(`  ${o.file}:${o.line}  ${o.reason}`);
console.error(
  '\nUnit specs (`src/**/*.spec.ts`) run without Postgres / Redis / BullMQ. ' +
    'Move the spec under `test/infrastructure/integration/` if it needs real adapters, ' +
    'or escape with `// lint-allow-db-in-unit: <reason>`.',
);
process.exit(1);
