/**
 * P1-058 — report which use cases have spec tests and which don't.
 *
 * The audit flagged ~23% of use cases (87/375) as untested. The
 * cheapest way to keep that number from drifting up is a CI-visible
 * report that prints the gap. This script enumerates every
 * `*.use-case.ts` (excluding specs and barrels) and checks for an
 * adjacent `*.use-case.spec.ts`. Output:
 *
 *   - count of UCs total
 *   - count covered (have a sibling spec)
 *   - count uncovered + the file paths
 *   - percentage covered
 *
 * Report-only by default; pass `--strict` to fail when coverage
 * dips below a baseline (set via `--min-percent N`, default 75).
 */

import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { Glob } from 'bun';

const SRC = resolve('src');

async function main(): Promise<void> {
  const glob = new Glob('**/*.use-case.ts');
  const ucs: string[] = [];
  for await (const rel of glob.scan({ cwd: SRC })) {
    if (rel.endsWith('.spec.ts')) continue;
    if (rel.endsWith('.test.ts')) continue;
    ucs.push(rel);
  }

  const covered: string[] = [];
  const uncovered: string[] = [];

  for (const rel of ucs) {
    const abs = join(SRC, rel);
    const specPath = abs.replace(/\.use-case\.ts$/, '.use-case.spec.ts');
    const altSpecPath = join(dirname(abs), '__tests__', `${
      rel.split('/').pop()?.replace(/\.use-case\.ts$/, '.use-case.spec.ts') ?? ''
    }`);
    if (existsSync(specPath) || existsSync(altSpecPath)) {
      covered.push(rel);
    } else {
      uncovered.push(rel);
    }
  }

  const total = ucs.length;
  const pctCovered = total === 0 ? 100 : Math.round((covered.length / total) * 100);

  console.log(`[check-uc-coverage] ${covered.length}/${total} use cases have a spec (${pctCovered}%)`);
  if (uncovered.length > 0) {
    console.log(`[check-uc-coverage] ${uncovered.length} uncovered:`);
    for (const rel of uncovered) {
      console.log(`  ${relative('.', join(SRC, rel))}`);
    }
  }

  const strict = process.argv.includes('--strict');
  const minIdx = process.argv.indexOf('--min-percent');
  const minPercent =
    minIdx >= 0 ? Number.parseInt(process.argv[minIdx + 1] ?? '75', 10) : 75;
  if (strict && pctCovered < minPercent) {
    console.error(
      `[check-uc-coverage] coverage ${pctCovered}% below threshold ${minPercent}%`,
    );
    process.exit(1);
  }
}

void main();
