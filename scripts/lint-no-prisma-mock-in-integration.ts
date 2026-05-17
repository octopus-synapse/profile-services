#!/usr/bin/env bun
/**
 * Integration and e2e specs MUST hit real Postgres / Redis / BullMQ.
 * The whole reason they live under `test/infrastructure/` is to catch
 * drift between application logic and the real adapters — a mocked
 * Prisma client in an integration spec is unit-test theatre.
 *
 * Forbidden modules to mock inside `test/infrastructure/integration/`
 * and `test/infrastructure/e2e/`:
 *   @prisma/client
 *   prisma
 *   ioredis / redis
 *   bullmq
 *   socket.io / socket.io-client
 *
 * Forbidden mock APIs (any of these calling-out a forbidden module):
 *   mock.module('<mod>', ...)        // bun:test
 *   jest.mock('<mod>', ...)
 *   vi.mock('<mod>', ...)
 *   spyOn(prismaClient, ...)         // direct prisma spying
 *
 * Inline escape `// lint-allow-prisma-mock: <reason>` for rare cases
 * (e.g. a probe that intentionally simulates a Prisma outage).
 *
 * Run: bun run scripts/lint-no-prisma-mock-in-integration.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const ROOTS = ['test/infrastructure/integration', 'test/infrastructure/e2e'];

const BANNED_MODULES = [
  '@prisma/client',
  'prisma',
  'ioredis',
  'redis',
  'bullmq',
  'socket.io',
  'socket.io-client',
];
const moduleAlt = BANNED_MODULES.map((m) => m.replace(/[/.]/g, '\\$&')).join('|');
const MOCK_RE = new RegExp(
  `\\b(?:mock\\.module|jest\\.mock|vi\\.mock)\\s*\\(\\s*['"\`](${moduleAlt})['"\`]`,
  'g',
);
const SPY_PRISMA_RE =
  /\bspyOn\s*\(\s*[a-zA-Z_$][\w$]*\s*,\s*['"`](?:\$transaction|\$connect|\$disconnect|\$on|\$use|\$extends)['"`]/g;
const ESCAPE = /lint-allow-prisma-mock:\s*\S/;

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

type Offense = { file: string; line: number; match: string };
const offenses: Offense[] = [];

for (const r of ROOTS) {
  for (const file of walk(join(ROOT, r))) {
    const rel = relative(ROOT, file);
    const src = readFileSync(file, 'utf8');
    const lines = src.split('\n');

    MOCK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
    while ((m = MOCK_RE.exec(src)) !== null) {
      const line = src.slice(0, m.index).split('\n').length;
      if (ESCAPE.test(lines[line - 1] || '') || ESCAPE.test(lines[line - 2] || '')) continue;
      offenses.push({ file: rel, line, match: `mock of "${m[1]}"` });
    }
    SPY_PRISMA_RE.lastIndex = 0;
    let s: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
    while ((s = SPY_PRISMA_RE.exec(src)) !== null) {
      const line = src.slice(0, s.index).split('\n').length;
      if (ESCAPE.test(lines[line - 1] || '') || ESCAPE.test(lines[line - 2] || '')) continue;
      offenses.push({ file: rel, line, match: 'spyOn Prisma client method' });
    }
  }
}

if (offenses.length === 0) {
  console.log('lint-no-prisma-mock-in-integration: 0 violations');
  process.exit(0);
}
console.error(`lint-no-prisma-mock-in-integration: ${offenses.length} violation(s):`);
for (const o of offenses) console.error(`  ${o.file}:${o.line}  ${o.match}`);
console.error(
  '\nIntegration / e2e specs must hit real Postgres / Redis / BullMQ. ' +
    'If this is genuinely the right call, escape with `// lint-allow-prisma-mock: <reason>`.',
);
process.exit(1);
