/**
 * P2-086 — every `*.routes.ts` should have a sibling
 * `*.routes.schemas.ts` so routes/handlers stay free of inline Zod
 * schemas. The split keeps each file under the architecture
 * size-budget (P2-091) and forces the schema layer through a single
 * point reviewers know to inspect.
 *
 * Current state: 7 known offenders (health, spoken-languages,
 * skills, i18n, two-factor-auth, upload, realtime). Each is small
 * enough that splitting can be done in a follow-up PR; this script
 * stops *new* offenders from creeping in.
 *
 * Usage:
 *   bun scripts/check-route-schemas-companion.ts
 *   bun scripts/check-route-schemas-companion.ts --strict   # CI gate
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Glob } from 'bun';

const SRC_DIR = resolve('src/bounded-contexts');

// Known offenders the audit identified as P2-086. Stops the ratchet
// from re-flagging them on every run while letting NEW additions
// fail the strict gate.
const ALLOWLIST = new Set<string>([
  'src/bounded-contexts/platform/health/health.routes.ts',
  'src/bounded-contexts/skills-catalog/spoken-languages/spoken-languages.routes.ts',
  'src/bounded-contexts/skills-catalog/skills/skills.routes.ts',
  'src/bounded-contexts/platform/i18n/i18n.routes.ts',
  'src/bounded-contexts/identity/two-factor-auth/two-factor-auth.routes.ts',
  'src/bounded-contexts/integration/upload/upload.routes.ts',
  'src/bounded-contexts/platform/realtime/infrastructure/http/realtime.routes.ts',
]);

const SCHEMA_PATTERN = /\bz\.(object|array|string|number|boolean|enum|literal|union)\b/;

async function main(): Promise<void> {
  const violations: string[] = [];
  const allowlistRemoved = new Set(ALLOWLIST);

  for await (const rel of new Glob('**/*.routes.ts').scan({ cwd: SRC_DIR })) {
    if (rel.endsWith('.spec.ts')) continue;
    const abs = resolve(SRC_DIR, rel);
    const companion = abs.replace(/\.routes\.ts$/, '.routes.schemas.ts');
    if (existsSync(companion)) continue;
    const src = readFileSync(abs, 'utf8');
    if (!SCHEMA_PATTERN.test(src)) continue;
    const relProject = `src/bounded-contexts/${rel}`;
    if (ALLOWLIST.has(relProject)) {
      allowlistRemoved.delete(relProject);
      continue;
    }
    violations.push(relProject);
  }

  const strict = process.argv.includes('--strict');

  if (allowlistRemoved.size > 0) {
    console.log('[check-route-schemas-companion] allowlist entries no longer needed:');
    for (const f of allowlistRemoved) console.log(`  - ${f}`);
  }

  if (violations.length === 0) {
    console.log('[check-route-schemas-companion] OK');
    return;
  }

  console.error(
    `[check-route-schemas-companion] ${violations.length} new violation(s) (split into *.routes.schemas.ts):`,
  );
  for (const f of violations) console.error(`  ${f}`);
  if (strict) process.exit(1);
}

void main();
