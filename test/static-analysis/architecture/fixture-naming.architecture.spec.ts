/**
 * Q57: factory functions follow a deliberate naming convention so a
 * reader of a spec immediately knows whether the helper hits the DB.
 *
 *   - `build*`     — in-memory object only (no DB, no I/O).
 *   - `freshInDb*` — DB-provisioned (creates rows, returns the entity).
 *
 * Everything under `test/shared/factories/` is in scope. Internal
 * helpers (non-exported) and `default` exports are exempt. Type
 * aliases re-exported from these modules are also exempt — only
 * value exports are checked.
 *
 * Fixtures under `test/infrastructure/e2e/fixtures/` are NOT factories
 * (they return plain data shapes, no entity construction) and are out
 * of scope.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const FACTORIES_DIR = join(ROOT, 'test/shared/factories');

const VALUE_EXPORT_RE = /^export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/gm;
const ALLOWED_PREFIX_RE = /^(?:build|freshInDb)[A-Z]/;
const IGNORED_NAMES = new Set<string>(['default']);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      walk(abs, acc);
    } else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.test.ts') &&
      entry !== 'index.ts'
    ) {
      acc.push(abs);
    }
  }
  return acc;
}

describe('arch: factory naming — build* or freshInDb*', () => {
  it('every value export in test/shared/factories starts with `build` or `freshInDb`', () => {
    const offenders: Array<{ file: string; name: string }> = [];
    for (const file of walk(FACTORIES_DIR)) {
      const rel = relative(ROOT, file);
      const src = readFileSync(file, 'utf8');
      VALUE_EXPORT_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = VALUE_EXPORT_RE.exec(src)) !== null) {
        const name = m[1];
        if (IGNORED_NAMES.has(name)) continue;
        if (!ALLOWED_PREFIX_RE.test(name)) {
          offenders.push({ file: rel, name });
        }
      }
    }
    if (offenders.length > 0) {
      const lines = offenders.map((o) => `  - ${o.file}: ${o.name}`).join('\n');
      throw new Error(
        'Factory naming violations — rename to `build*` (in-memory) or `freshInDb*` (DB-backed):\n' +
          lines,
      );
    }
    expect(offenders).toEqual([]);
  });
});
