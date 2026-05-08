#!/usr/bin/env bun
/**
 * NEW-1 lint rule (warn-default).
 *
 * Walks every `*.routes.ts` and inventories the `guards: [{ id }]`
 * declarations. Compares the set of declared ids against the registry
 * of pipeline stages we actually implement in `elysia-pipeline.ts`.
 * Logs any guard id that's declared by ≥1 route but has no
 * corresponding pipeline stage — those declarations are silently
 * passing through (the same NEW-1 finding that motivated this PR).
 *
 * Mode controlled by `GUARDS_LINT_MODE` env var:
 *   - "warn" (default): logs offenders, exit 0 (gives the team time to
 *     either implement the missing guards or strip the declarations
 *     without breaking CI).
 *   - "error": exit 1 if any unimplemented guard is found.
 *
 * Today's implemented guards: rate-limit, throttle, allow-unverified-email,
 * skip-tos-check, ownership, feature-flag.
 *
 * Today's known-unimplemented (P1 follow-up tasks):
 *   - internal-auth   (mec-sync admin endpoints)
 *   - metrics-key     (Prometheus /metrics)
 *   - min-quality     (auto-apply gating on resume quality score)
 *   - fit-profile     (auto-apply gating on valid fit-profile)
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src'];
const SKIP_DIRS = new Set(['node_modules', 'testing', '__mocks__', '__tests__', 'test']);

const IMPLEMENTED_GUARDS = new Set<string>([
  'rate-limit',
  'throttle',
  'allow-unverified-email',
  'skip-tos-check',
  'ownership',
  'feature-flag',
  'internal-auth',
  'metrics-key',
  'fit-profile',
  'min-quality',
  'external-api',
  'multi-step-flow',
]);

// Empty after the NEW-1 follow-up shipped. Kept for future declarations
// that land before their pipeline stage — nothing should sit here long.
const KNOWN_TODO_GUARDS = new Set<string>([]);

const GUARD_RE = /id:\s*['"]([a-z][a-z0-9-]*)['"]/g;
const GUARDS_BLOCK_RE = /guards\s*:\s*\[/g;

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
    else if (entry.endsWith('.routes.ts')) yield full;
  }
}

interface GuardUsage {
  readonly file: string;
  readonly line: number;
  readonly id: string;
}

const usages: GuardUsage[] = [];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = readFileSync(file, 'utf8');

    GUARDS_BLOCK_RE.lastIndex = 0;
    let blockMatch: RegExpExecArray | null;
    while ((blockMatch = GUARDS_BLOCK_RE.exec(src)) !== null) {
      // Walk forward to balanced ']' to scope the guard ids to one
      // route's `guards: [...]` block (avoid false positives from
      // stray `id: ...` in surrounding code).
      let depth = 1;
      let j = blockMatch.index + blockMatch[0].length;
      while (j < src.length && depth > 0) {
        const ch = src[j];
        if (ch === '[') depth++;
        else if (ch === ']') depth--;
        j++;
      }
      const block = src.slice(blockMatch.index + blockMatch[0].length, j - 1);
      GUARD_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = GUARD_RE.exec(block)) !== null) {
        const lineNum = src.slice(0, blockMatch.index + m.index).split('\n').length;
        usages.push({ file, line: lineNum, id: m[1] });
      }
    }
  }
}

const declaredIds = new Map<string, GuardUsage[]>();
for (const u of usages) {
  const list = declaredIds.get(u.id) ?? [];
  list.push(u);
  declaredIds.set(u.id, list);
}

const offenders: Array<{ id: string; usages: GuardUsage[] }> = [];
for (const [id, list] of declaredIds.entries()) {
  if (IMPLEMENTED_GUARDS.has(id)) continue;
  offenders.push({ id, usages: list });
}

const mode = process.env.GUARDS_LINT_MODE === 'error' ? 'error' : 'warn';

if (offenders.length === 0) {
  // eslint-disable-next-line no-console
  console.log(
    `check-route-guards: 0 unimplemented guard ids (${declaredIds.size} declared, all implemented).`,
  );
  process.exit(0);
}

// eslint-disable-next-line no-console
console.log(
  `check-route-guards (${mode}): ${offenders.length} unimplemented guard id(s) declared on routes:\n`,
);
for (const { id, usages } of offenders) {
  const tag = KNOWN_TODO_GUARDS.has(id) ? ' [KNOWN TODO]' : '';
  // eslint-disable-next-line no-console
  console.log(`  • ${id}${tag} — ${usages.length} usage(s):`);
  for (const u of usages) {
    // eslint-disable-next-line no-console
    console.log(`      ${u.file}:${u.line}`);
  }
}

if (mode === 'error') {
  // eslint-disable-next-line no-console
  console.log(
    '\nEither implement a `*.stage.ts` for the guard id and register it in elysia-pipeline.ts,\n' +
      'or drop the declaration from the route. Until then the route is silently un-guarded.',
  );
  process.exit(1);
}
process.exit(0);
