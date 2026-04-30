/**
 * No `@nestjs/*` outside the adapter — ratcheting acceptance test.
 *
 * Goal: every `@nestjs/*` import lives in
 * `src/infrastructure/nest-adapter/` (the only place that knows about
 * the host framework). Domain, application, route descriptors and
 * compositions must stay framework-free.
 *
 * Today the rollout is mid-way through Phase 3.10 — many controllers
 * still ship as Nest classes. This test takes a baseline of the
 * current offender count and only allows it to shrink. When the count
 * reaches zero, flip the assertion to `toBe(0)` and delete the
 * baseline file.
 *
 * Allowlist (legitimate `@nestjs/*` consumers that are NOT business
 * code and live outside the adapter for historical reasons):
 *  - `src/main.ts` — bootstrap entry-point still imports `AppModule`.
 *  - `src/app.module.ts` — top-level module decorator.
 *  - `src/bounded-contexts/platform/health/` — Terminus indicators
 *    are out of scope for the swap (see plan §"Health module").
 *  - `src/...spec.ts` — tests can use `Test.createTestingModule`.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_ROOT = 'src';
const BASELINE_FILE = join(__dirname, 'no-nest-outside-adapter.baseline.json');

const ALLOWLIST_PREFIXES = [
  'src/infrastructure/nest-adapter/',
  'src/bounded-contexts/platform/health/',
];
const ALLOWLIST_FILES = new Set(['src/main.ts', 'src/app.module.ts']);

interface Baseline {
  readonly count: number;
}

function* walk(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '__mocks__') continue;
    const f = join(dir, e.name);
    if (e.isDirectory()) yield* walk(f);
    else if (e.isFile()) yield f;
  }
}

function isAllowlisted(rel: string): boolean {
  if (ALLOWLIST_FILES.has(rel)) return true;
  if (rel.endsWith('.spec.ts') || rel.endsWith('.test.ts')) return true;
  return ALLOWLIST_PREFIXES.some((p) => rel.startsWith(p));
}

const NEST_IMPORT_RE = /from\s+['"]@nestjs\//;

interface Offender {
  readonly file: string;
  readonly samples: readonly string[];
}

function audit(): Offender[] {
  const out: Offender[] = [];
  for (const f of walk(SRC_ROOT)) {
    if (!f.endsWith('.ts')) continue;
    const rel = relative('.', f).replace(/\\/g, '/');
    if (isAllowlisted(rel)) continue;
    const content = readFileSync(f, 'utf8');
    const matches: string[] = [];
    for (const line of content.split('\n')) {
      if (NEST_IMPORT_RE.test(line)) matches.push(line.trim());
    }
    if (matches.length > 0) {
      out.push({ file: rel, samples: matches.slice(0, 1) });
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

function readBaseline(): Baseline {
  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Baseline;
}

function writeBaseline(next: Baseline): void {
  writeFileSync(BASELINE_FILE, `${JSON.stringify(next, null, 2)}\n`);
}

describe('No @nestjs/* outside the adapter', () => {
  it('files importing @nestjs/* outside the adapter only shrink', () => {
    const offenders = audit();
    const stored = readBaseline();
    const current = offenders.length;

    if (current > 0) {
      // Print only the first 10 — the full list is huge during rollout.
      console.warn(
        `\n${current} file(s) still import @nestjs/* outside the adapter (showing 10):\n${offenders
          .slice(0, 10)
          .map((o) => `  - ${o.file}\n      ${o.samples.join('\n      ')}`)
          .join('\n')}\n`,
      );
    }

    if (current < stored.count) {
      writeBaseline({ count: current });
    }

    expect(current).toBeLessThanOrEqual(stored.count);
  });
});
