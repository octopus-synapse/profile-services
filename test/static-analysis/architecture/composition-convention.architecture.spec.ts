/**
 * Composition convention
 *
 * To make framework substitution (NestJS → Elysia / Fastify / Hono)
 * trivial, every BC's wiring must live in a `*.composition.ts` function
 * with **zero `@nestjs/*` imports**. The Nest module is reduced to a
 * thin shell that exposes the bundle as one provider:
 *
 *   {
 *     provide: SomeUseCases,
 *     useFactory: (...) => buildSomeUseCases(...),
 *     inject: [...],
 *   }
 *
 * Two failure modes ratcheted here:
 *
 *   1. A `*.module.ts` still contains `useFactory: ... new XUseCase(...)`
 *      — i.e. it instantiates use cases inline instead of routing them
 *      through a composition function.
 *   2. A `*.composition.ts` imports anything `from '@nestjs/...'` — the
 *      composition is supposed to be framework-free.
 *
 * Both counts only shrink. New violations fail the test. Once both
 * reach 0, lock them with `toBe(0)` and remove the baseline file.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_ROOT = 'src';
const BASELINE_FILE = join(__dirname, 'composition-convention.baseline.json');

interface Baseline {
  readonly directlyWiredModules: number;
  readonly nestInComposition: number;
}

function* walk(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '__mocks__') continue;
    const f = join(dir, e.name);
    if (e.isDirectory()) yield* walk(f);
    else if (e.isFile()) yield f;
  }
}

const DIRECT_USE_CASE_RE = /useFactory:[^,;]*new\s+[A-Z]\w*UseCase\s*\(/;
const NEST_IMPORT_RE = /from\s+['"]@nestjs\//;

interface Violation {
  readonly path: string;
  readonly samples: readonly string[];
}

function findDirectlyWiredModules(): Violation[] {
  const out: Violation[] = [];
  for (const f of walk(SRC_ROOT)) {
    if (!f.endsWith('.module.ts')) continue;
    const content = readFileSync(f, 'utf8');
    const matches: string[] = [];
    for (const line of content.split('\n')) {
      if (DIRECT_USE_CASE_RE.test(line)) matches.push(line.trim());
    }
    if (matches.length > 0) {
      out.push({ path: relative(SRC_ROOT, f), samples: matches.slice(0, 2) });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function findNestInComposition(): Violation[] {
  const out: Violation[] = [];
  for (const f of walk(SRC_ROOT)) {
    if (!f.endsWith('.composition.ts')) continue;
    const content = readFileSync(f, 'utf8');
    const matches: string[] = [];
    for (const line of content.split('\n')) {
      if (NEST_IMPORT_RE.test(line)) matches.push(line.trim());
    }
    if (matches.length > 0) {
      out.push({ path: relative(SRC_ROOT, f), samples: matches });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function readBaseline(): Baseline {
  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Baseline;
}

function writeBaseline(next: Baseline): void {
  writeFileSync(BASELINE_FILE, `${JSON.stringify(next, null, 2)}\n`);
}

describe('Composition convention', () => {
  it('modules wiring use cases inline (instead of via build*UseCases) only shrink', () => {
    const offenders = findDirectlyWiredModules();
    const stored = readBaseline();
    const current = offenders.length;

    if (current > 0) {
      console.warn(
        `\n${current} module(s) still wire use cases inline:\n${offenders
          .map((o) => `  - ${o.path}\n      ${o.samples.join('\n      ')}`)
          .join('\n')}\n`,
      );
    }

    if (current < stored.directlyWiredModules) {
      writeBaseline({ ...stored, directlyWiredModules: current });
    }

    expect(current).toBeLessThanOrEqual(stored.directlyWiredModules);
  });

  it('*.composition.ts files importing from @nestjs/* only shrink', () => {
    const offenders = findNestInComposition();
    const stored = readBaseline();
    const current = offenders.length;

    if (current > 0) {
      console.warn(
        `\n${current} composition file(s) still import from @nestjs/*:\n${offenders
          .map((o) => `  - ${o.path}\n      ${o.samples.join('\n      ')}`)
          .join('\n')}\n`,
      );
    }

    if (current < stored.nestInComposition) {
      writeBaseline({ ...stored, nestInComposition: current });
    }

    expect(current).toBeLessThanOrEqual(stored.nestInComposition);
  });
});
