/**
 * Q41 + Q67: file suffixes are load-bearing — scripts and arch rules
 * pattern-match on them. The convention:
 *
 *   *.use-case.ts          MUST export `class XxxUseCase`
 *   *.port.ts              MUST export `abstract class` or `interface`
 *   *.routes.ts            MUST export `const xxxRoutes: ReadonlyArray<Route<...>>`
 *                          AND not contain inline `z.object(...)` schemas
 *                          (those live in `*.routes.schemas.ts`)
 *   *.adapter.ts           MUST `extends` or `implements` something
 *
 * The lint covers all four. False-positive headroom: it greps the file
 * body, so legitimately re-exporting (`export * from`) or splitting
 * across multiple files in the same .use-case.ts module is rare and
 * can be escape-commented with `// lint-allow-file-suffix: <reason>`.
 */

import { describe, expect, it } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const SRC = join(ROOT, 'src');
const ESCAPE_RE = /lint-allow-file-suffix:\s*\S/;

const BASELINE_ROUTES_INLINE_ZOD = resolve(
  ROOT,
  'test/static-analysis/architecture/file-suffix.routes-inline-zod.baseline.txt',
);
const BASELINE_ADAPTER_NO_EXTENDS = resolve(
  ROOT,
  'test/static-analysis/architecture/file-suffix.adapter-no-extends.baseline.txt',
);

function ratchet(name: string, total: number, baselinePath: string, offenders: string[]): void {
  if (process.env.UPDATE_BASELINE === '1') {
    writeFileSync(baselinePath, `${total}\n`);
    return;
  }
  const baseline = existsSync(baselinePath) ? Number(readFileSync(baselinePath, 'utf8').trim()) : 0;
  if (total > baseline) {
    const lines = offenders.map((o) => `  - ${o}`).join('\n');
    throw new Error(
      `${name} regression: ${total - baseline} new offender(s). Total ${total} (baseline ${baseline}).\n${lines}`,
    );
  }
}

const USE_CASE_RE = /export\s+(?:abstract\s+)?class\s+\w*UseCase\b/;
const PORT_RE = /export\s+(?:abstract\s+class|interface|type)\s+\w+/;
const ROUTES_VALUE_RE = /export\s+const\s+\w+Routes\s*[:=]/;
const INLINE_ZOD_RE = /\bz\.(?:object|array|union|discriminatedUnion|tuple)\s*\(/;
const ADAPTER_RE = /class\s+\w+\s+(?:extends|implements)\s+/;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'build') continue;
      walk(abs, acc);
    } else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.test.ts')
    ) {
      acc.push(abs);
    }
  }
  return acc;
}

const allFiles = walk(SRC);

describe('arch: file suffix conventions', () => {
  it('*.use-case.ts exports a class whose name ends with `UseCase`', () => {
    const offenders: string[] = [];
    for (const file of allFiles) {
      if (!file.endsWith('.use-case.ts')) continue;
      const src = readFileSync(file, 'utf8');
      if (ESCAPE_RE.test(src)) continue;
      if (!USE_CASE_RE.test(src)) offenders.push(relative(ROOT, file));
    }
    expect(offenders).toEqual([]);
  });

  it('*.port.ts exports an `abstract class` or `interface`', () => {
    const offenders: string[] = [];
    for (const file of allFiles) {
      if (!file.endsWith('.port.ts')) continue;
      const src = readFileSync(file, 'utf8');
      if (ESCAPE_RE.test(src)) continue;
      if (!PORT_RE.test(src)) offenders.push(relative(ROOT, file));
    }
    expect(offenders).toEqual([]);
  });

  it('*.routes.ts exports a `xxxRoutes` const (hard rule)', () => {
    const offenders: string[] = [];
    for (const file of allFiles) {
      if (!file.endsWith('.routes.ts')) continue;
      if (file.endsWith('.routes.schemas.ts')) continue;
      const src = readFileSync(file, 'utf8');
      if (ESCAPE_RE.test(src)) continue;
      if (!ROUTES_VALUE_RE.test(src)) offenders.push(relative(ROOT, file));
    }
    expect(offenders).toEqual([]);
  });

  it('*.routes.ts has no inline Zod schemas (baseline-ratchet)', () => {
    const offenders: string[] = [];
    for (const file of allFiles) {
      if (!file.endsWith('.routes.ts')) continue;
      if (file.endsWith('.routes.schemas.ts')) continue;
      const src = readFileSync(file, 'utf8');
      if (ESCAPE_RE.test(src)) continue;
      if (INLINE_ZOD_RE.test(src)) offenders.push(relative(ROOT, file));
    }
    ratchet('routes-inline-zod', offenders.length, BASELINE_ROUTES_INLINE_ZOD, offenders);
  });

  it('*.adapter.ts declares `extends` or `implements` (baseline-ratchet)', () => {
    const offenders: string[] = [];
    for (const file of allFiles) {
      if (!file.endsWith('.adapter.ts')) continue;
      const src = readFileSync(file, 'utf8');
      if (ESCAPE_RE.test(src)) continue;
      if (!ADAPTER_RE.test(src)) offenders.push(relative(ROOT, file));
    }
    ratchet('adapter-no-extends', offenders.length, BASELINE_ADAPTER_NO_EXTENDS, offenders);
  });
});
