#!/usr/bin/env bun
/**
 * Cat 5 #1: bare integer/float literals in feature code without
 * named context are a quiet drift source. The Biome `noMagicNumbers`
 * rule is too aggressive for this codebase (HTTP status, polynomial
 * weights, time literals, byte sizes — thousands of false positives).
 *
 * This custom lint catches the literals that actually matter:
 *
 *   - Time literals in milliseconds bigger than 999 — they must be a
 *     named constant (a `setTimeout(handler, 30000)` is the bug;
 *     `setTimeout(handler, NOTIFY_DELAY_MS)` is the fix).
 *   - Numeric literals other than the allowlist in `bounded-contexts/**`.
 *     Allowlist matches the V3 audit + Cat 5 #1 spec:
 *       Math primitives:  0 1 -1 2 10 100 1000
 *       Time multipliers: 60 3600 86400 (s/min/hr/day in seconds)
 *       HTTP statuses:    200 201 204 400 401 403 404 409 422 500
 *       CSS scale (FE):   8 12 16 24 32 48 64 (rare in backend, kept inclusive)
 *
 * Baseline-ratchet — there are bound to be existing offenders worth
 * cleaning up over time but not in one sweep.
 *
 * Inline escape `// lint-allow-magic-number: <reason>` on the same line.
 *
 * Run: bun run scripts/lint-magic-numbers.ts
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src/bounded-contexts');
const BASELINE_PATH = resolve(ROOT, 'scripts/lint-magic-numbers.baseline.txt');

const ALLOWED = new Set<number>([
  0, 1, -1, 2, 8, 10, 12, 16, 24, 32, 48, 60, 64, 100, 200, 201, 204, 400, 401, 403, 404, 409, 422,
  500, 1000, 3600, 86400,
]);

// Match a numeric literal that isn't part of an identifier/property
// (avoid matching `v2` or `foo.4`) and isn't directly inside a string.
// We rely on per-line scanning + a quick string-strip; not bullet-proof
// but good enough for the ratchet pattern.
const NUM_RE = /(?<![A-Za-z_$.\d])-?\d+(?:\.\d+)?(?:e[+-]?\d+)?(?![\w$])/g;
const ESCAPE_RE = /lint-allow-magic-number:\s*\S/;

function stripStringsAndComments(line: string): string {
  let out = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inBack = false;
  while (i < line.length) {
    const ch = line[i];
    if (!inSingle && !inDouble && !inBack && ch === '/' && line[i + 1] === '/') return out;
    if (!inSingle && !inDouble && !inBack && ch === '/' && line[i + 1] === '*') {
      const end = line.indexOf('*/', i + 2);
      if (end === -1) return out;
      i = end + 2;
      continue;
    }
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (!inDouble && !inBack && ch === "'") inSingle = !inSingle;
    else if (!inSingle && !inBack && ch === '"') inDouble = !inDouble;
    else if (!inSingle && !inDouble && ch === '`') inBack = !inBack;
    if (!inSingle && !inDouble && !inBack) out += ch;
    else out += ' '; // keep column alignment but blank string content
    i++;
  }
  return out;
}

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
    else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.d.ts') &&
      // Const modules legitimately enumerate magic numbers.
      !entry.endsWith('.const.ts') &&
      !entry.endsWith('.constants.ts')
    )
      yield full;
  }
}

type Site = { file: string; line: number; value: number; escaped: boolean };
const sites: Site[] = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const stripped = stripStringsAndComments(lines[i]);
    NUM_RE.lastIndex = 0;
    for (
      let m: RegExpExecArray | null = NUM_RE.exec(stripped);
      m !== null;
      m = NUM_RE.exec(stripped)
    ) {
      const raw = m[0];
      // Skip when number is inside an exponent/version-like token (already filtered by lookarounds).
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      if (Number.isInteger(n) && ALLOWED.has(n)) continue;
      // Floats inherit the same allowlist (0.5, 1.5 etc. fall through as magic).
      if (ESCAPE_RE.test(lines[i] || '')) continue;
      sites.push({ file: rel, line: i + 1, value: n, escaped: false });
    }
  }
}

const total = sites.length;

if (process.env.UPDATE_BASELINE === '1') {
  writeFileSync(BASELINE_PATH, `${total}\n`);
  console.log(`[magic-numbers] baseline updated to ${total}`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH) ? Number(readFileSync(BASELINE_PATH, 'utf8').trim()) : 0;

if (total > baseline) {
  console.error(
    `lint-magic-numbers: regression — ${total - baseline} new occurrence(s). ` +
      `Total ${total} (baseline ${baseline}).`,
  );
  console.error(
    '\nExtract to a named constant in `*.const.ts` / `*.constants.ts`, ' +
      'or — if the literal is intrinsic at this site — escape with ' +
      '`// lint-allow-magic-number: <reason>`.\n',
  );
  for (const s of sites.slice(-20)) console.error(`  ${s.file}:${s.line}  ${s.value}`);
  process.exit(1);
}
console.log(`lint-magic-numbers: ${total} occurrence(s) (baseline ${baseline}), within budget`);
