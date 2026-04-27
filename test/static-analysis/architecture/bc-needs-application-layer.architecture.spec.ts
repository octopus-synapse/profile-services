/**
 * BC needs an application layer
 *
 * Every BC that exposes HTTP — i.e. ships at least one *.controller.ts —
 * is supposed to follow the hexagonal layout in ADR-001 / ADR-002:
 *
 *   <bc>/
 *   ├── application/
 *   │   ├── use-cases/         ← intentions, POJO
 *   │   └── compositions/      ← wiring helpers
 *   ├── domain/
 *   └── infrastructure/
 *       └── controllers/       ← thin wires
 *
 * BCs still in the controller→service shape (no `application/use-cases/`)
 * pull business logic into the HTTP edge, can't be exercised from a worker
 * or webhook, and need TestingModule for every test. This audit catches
 * them so we can convert them one at a time. The baseline ratchets down
 * on each BC migrated; the test fails if a regression introduces a new
 * controller-only BC.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const BC_ROOT = 'src/bounded-contexts';

function* walk(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (
      e.name === 'node_modules' ||
      e.name === '__tests__' ||
      e.name === 'testing' ||
      e.name === '__mocks__'
    ) continue;
    const f = join(dir, e.name);
    if (e.isDirectory()) yield* walk(f);
    else if (e.isFile()) yield f;
  }
}

/** A BC root is any folder under `bounded-contexts/` that ships its own
 *  `*.module.ts`. Top-level (`automation/`) and nested (`identity/users/`)
 *  both qualify. */
function discoverBcRoots(): string[] {
  const roots: string[] = [];
  for (const top of readdirSync(BC_ROOT)) {
    const topPath = join(BC_ROOT, top);
    if (!statSync(topPath).isDirectory()) continue;
    if (readdirSync(topPath).some((f) => f.endsWith('.module.ts'))) {
      roots.push(`${BC_ROOT}/${top}`);
    }
    for (const sub of readdirSync(topPath)) {
      const subPath = join(topPath, sub);
      if (!statSync(subPath).isDirectory()) continue;
      if (readdirSync(subPath).some((f) => f.endsWith('.module.ts'))) {
        roots.push(`${BC_ROOT}/${top}/${sub}`);
      }
    }
  }
  return roots.sort();
}

interface Offender {
  readonly bc: string;
  readonly controllers: number;
}

function audit(): Offender[] {
  const out: Offender[] = [];
  for (const root of discoverBcRoots()) {
    let controllers = 0;
    let hasUseCases = false;
    // Match a real `.use-case.ts` file inside an `application/use-cases/`
    // tree. An empty placeholder folder (e.g. `.gitkeep`) doesn't count.
    const useCaseRe = /(^|\/)application\/use-cases\/.+\.use-case\.ts$/;
    for (const f of walk(root)) {
      const rel = relative(root, f).replace(/\\/g, '/');
      if (useCaseRe.test(rel) && !f.endsWith('.spec.ts') && !f.endsWith('.test.ts')) {
        hasUseCases = true;
      }
      if (
        f.endsWith('.controller.ts') &&
        !f.endsWith('.spec.ts') &&
        !f.endsWith('.test.ts')
      ) {
        controllers++;
      }
    }
    if (controllers > 0 && !hasUseCases) {
      out.push({ bc: relative(BC_ROOT, root), controllers });
    }
  }
  return out;
}

const BASELINE_FILE = join(__dirname, 'bc-needs-application-layer.baseline.json');

interface Baseline {
  readonly count: number;
}

function readBaseline(): Baseline {
  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Baseline;
}

function writeBaseline(next: Baseline): void {
  writeFileSync(BASELINE_FILE, `${JSON.stringify(next, null, 2)}\n`);
}

describe('BC needs application layer', () => {
  it('controller-only BCs without application/use-cases/ only shrink', () => {
    const offenders = audit();
    const stored = readBaseline();
    const current = offenders.length;

    if (current > 0) {
      console.warn(
        `\n${current} BC(s) still on controller-only shape:\n${offenders
          .map((o) => `  - ${o.bc} (${o.controllers} controller${o.controllers > 1 ? 's' : ''})`)
          .join('\n')}\n`,
      );
    }

    if (current < stored.count) {
      writeBaseline({ count: current });
    }

    expect(current).toBeLessThanOrEqual(stored.count);
  });
});
