#!/usr/bin/env bun
/**
 * Forbids `prisma db push` invocations anywhere a contributor or a
 * scheduled job could trigger them — scripts, Makefile, CI workflows.
 * `db push` skips migrations, mutating the schema directly; running it
 * against a shared environment desyncs migration history and forces
 * `prisma migrate resolve` to recover. The supported flow is
 * `prisma migrate dev` locally and `prisma migrate deploy` in
 * prod/staging.
 *
 * Scope: `scripts/**`, `.github/**`, `Makefile`, `package.json`
 * scripts entries, `docker-compose*.yml`. The allowlist below carries
 * intentional references (this script's own docstring, package.json
 * `prisma:push` shorthand kept for local prototyping against an
 * ephemeral DB the developer owns) — adding to it requires a comment
 * justifying why.
 *
 * Run:
 *   bun run scripts/lint-no-prisma-push.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const ROOTS = ['scripts', '.github', 'Makefile', 'package.json'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git']);

// Files / paths where `prisma push` (or its shorthand) is allowed.
// Keep narrow — every entry is a deliberate exception.
const ALLOWLIST = new Set<string>([
  // This script names the pattern in its own docstring.
  'scripts/lint-no-prisma-push.ts',
  // `prisma:push` npm script entry: documented escape for local
  // prototyping against an ephemeral DB. CI never invokes it.
  'package.json',
]);

const PATTERNS = [
  /\bprisma\s+db\s+push\b/i,
  /\bprisma:push\b/, // package.json script name OR shell alias
];

interface Offender {
  readonly path: string;
  readonly line: number;
  readonly snippet: string;
}

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      walk(abs, acc);
    } else {
      acc.push(abs);
    }
  }
  return acc;
}

function collect(): string[] {
  const out: string[] = [];
  for (const r of ROOTS) {
    const abs = join(ROOT, r);
    try {
      const stat = statSync(abs);
      if (stat.isDirectory()) {
        walk(abs, out);
      } else {
        out.push(abs);
      }
    } catch {
      // missing root is fine — Makefile etc. may not exist
    }
  }
  return out;
}

function scan(): Offender[] {
  const offenders: Offender[] = [];
  for (const file of collect()) {
    const rel = relative(ROOT, file);
    if (ALLOWLIST.has(rel)) continue;
    let body: string;
    try {
      body = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = body.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pat of PATTERNS) {
        if (pat.test(line)) {
          offenders.push({ path: rel, line: i + 1, snippet: line.trim() });
          break;
        }
      }
    }
  }
  return offenders;
}

const offenders = scan();
if (offenders.length === 0) {
  console.log('lint-no-prisma-push: 0 violations.');
  process.exit(0);
}

console.error(`lint-no-prisma-push: ${offenders.length} violation(s):`);
for (const o of offenders) {
  console.error(`  ${o.path}:${o.line}  ${o.snippet}`);
}
console.error('\nUse `prisma migrate dev` locally or `prisma migrate deploy` in prod.');
console.error('If you genuinely need `prisma db push` in a script, add the path to ALLOWLIST');
console.error('in scripts/lint-no-prisma-push.ts with a comment explaining why.');
process.exit(1);
