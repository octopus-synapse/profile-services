/**
 * Forbid `lib/`, `utils/`, `helpers/` directories inside a bounded
 * context. They become catch-all dump grounds where intent dies. The
 * convention is to force code into a typed namespace (service, port,
 * adapter, value-object) so its responsibility is explicit.
 *
 * shared-kernel is exempt — that's the canonical home for cross-BC
 * primitives, and it has its own structure (cache/, http/, schemas/, etc.)
 * which is precise, not catch-all.
 */

import { describe, expect, it } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const BCS = join(ROOT, 'src/bounded-contexts');
const FORBIDDEN = new Set(['lib', 'utils', 'helpers', 'util', 'misc']);
const BASELINE_PATH = resolve(
  ROOT,
  'test/static-analysis/architecture/no-dump-grounds.baseline.txt',
);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      acc.push(abs);
      walk(abs, acc);
    }
  }
  return acc;
}

describe('arch: no dump-ground directories in BCs', () => {
  it('no lib/ utils/ helpers/ inside bounded-contexts/<bc>/', () => {
    const offenders: string[] = [];
    for (const dir of walk(BCS)) {
      const rel = relative(ROOT, dir);
      const segments = rel.split('/');
      const lastSegment = segments[segments.length - 1];
      if (FORBIDDEN.has(lastSegment)) {
        offenders.push(rel);
      }
    }

    const total = offenders.length;
    if (process.env.UPDATE_BASELINE === '1') {
      writeFileSync(BASELINE_PATH, total + '\n');
      console.log('[no-dump-grounds] baseline updated to ' + total);
      return;
    }
    const baseline = existsSync(BASELINE_PATH)
      ? Number(readFileSync(BASELINE_PATH, 'utf8').trim())
      : 0;
    if (total > baseline) {
      const lines = offenders.map((o) => '  - ' + o).join('\n');
      throw new Error(
        'Dump-ground regression: ' +
          (total - baseline) +
          ' new offender(s). Total ' +
          total +
          ' (baseline ' +
          baseline +
          ').\n' +
          'Force code into a typed namespace (service / port / adapter / value-object) ' +
          'instead of lib/utils/helpers:\n' +
          lines,
      );
    }
    expect(total).toBeLessThanOrEqual(baseline);
  });
});
