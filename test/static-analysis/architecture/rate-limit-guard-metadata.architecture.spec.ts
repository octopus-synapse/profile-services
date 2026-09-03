/**
 * Rate-limit guards declare their window as `durationSeconds`.
 *
 * The pipeline used to accept `duration`, `ttl` and Nest's
 * `{ default: { ttl } }` and guess the unit from the magnitude
 * ("≥ 1000 is milliseconds"), so `duration: 3600` — one hour — was
 * enforced as three seconds on every route that asked for it. The field is
 * now named for its unit and the guessing is gone; this spec keeps the old
 * spellings from creeping back into a route descriptor.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const SRC = join(REPO, 'src');

function walkRouteFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walkRouteFiles(abs, acc);
    else if (entry.endsWith('.routes.ts')) acc.push(abs);
  }
  return acc;
}

/** Every `{ id: 'rate-limit' | 'throttle', metadata: {...} }` literal. */
const GUARD_LITERAL =
  /\{\s*id:\s*'(rate-limit|throttle)'\s*,\s*metadata:\s*(\{[^}]*(?:\{[^}]*\}[^}]*)?\})/g;

/** Doc comments quote the guard shape; only code counts. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('arch: rate-limit guard metadata is { points, durationSeconds, keyStrategy }', () => {
  const guards: Array<{ file: string; id: string; metadata: string }> = [];
  for (const abs of walkRouteFiles(SRC)) {
    const src = stripComments(readFileSync(abs, 'utf8'));
    for (const m of src.matchAll(GUARD_LITERAL)) {
      guards.push({ file: relative(REPO, abs), id: m[1] as string, metadata: m[2] as string });
    }
  }

  it('sanity: the scan finds the rate-limited routes', () => {
    expect(guards.length).toBeGreaterThanOrEqual(20);
  });

  it('no guard uses the retired id or the retired duration / ttl fields', () => {
    const offenders = guards
      .filter(
        (g) =>
          g.id === 'throttle' ||
          /\bduration\s*:/.test(g.metadata) ||
          /\bttl\s*:/.test(g.metadata) ||
          /\bdefault\s*:/.test(g.metadata),
      )
      .map((g) => `  - ${g.file}: { id: '${g.id}', metadata: ${g.metadata} }`);
    expect(offenders).toEqual([]);
  });

  it('every guard declares numeric points and durationSeconds', () => {
    const offenders = guards
      .filter(
        (g) =>
          !/\bpoints\s*:\s*\d+/.test(g.metadata) || !/\bdurationSeconds\s*:\s*\d+/.test(g.metadata),
      )
      .map((g) => `  - ${g.file}: ${g.metadata}`);
    expect(offenders).toEqual([]);
  });
});
