/**
 * Pagination types arch test.
 *
 * `page` and `limit` are pagination integers (Q1). Cursors are opaque
 * strings. Declaring `page: z.string()` or `limit: z.string()` in any
 * route schema means the route forces the frontend SDK to ship a
 * string where it should ship a number — every other paginated route
 * uses `z.coerce.number().int()` so this asymmetry pollutes the
 * generated types and forces the frontend to special-case.
 *
 * Detection: any `*.routes.schemas.ts` / `*.routes.ts` /
 * `*.schema.ts` under `src/bounded-contexts/` that declares
 * `(page|limit|pageSize): z.string(...)` fails the test.
 *
 * The accepted forms are `z.coerce.number().int()` (any chained
 * constraints are fine) or reusing `PaginationQuerySchema` from
 * `shared-kernel/schemas/common/api.types.ts`.
 *
 * If a route truly needs `page` or `limit` as a string for backwards
 * compat, allowlist it explicitly with a justification comment.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const PRODUCTION_ROOT = 'src/bounded-contexts';

// `(name): z.string(...)` matches `z.string()`, `z.string().optional()`,
// `z.string().min(1).max(80)`, etc. The lookahead requires `z.string`
// (not `z.coerce.string`).
const STRING_PAGINATION = /\b(page|limit|pageSize)\s*:\s*z\.string\(/;

const FILE_SUFFIXES = ['.routes.schemas.ts', '.routes.ts', '.schema.ts'];

const SKIP_PATH_FRAGMENTS = ['__tests__', '__mocks__', '/testing/', '.spec.ts', '.test.ts'];

const ALLOWLIST_FILES = new Set<string>([
  // Add entries here only when a route truly needs string pagination
  // (and document why in a comment next to the entry).
]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function isCandidateFile(path: string): boolean {
  if (!FILE_SUFFIXES.some((suffix) => path.endsWith(suffix))) return false;
  if (SKIP_PATH_FRAGMENTS.some((frag) => path.includes(frag))) return false;
  return true;
}

describe('Pagination types arch test', () => {
  it('page / limit / pageSize are integers, never z.string()', () => {
    const offenders: { file: string; line: number; snippet: string }[] = [];

    for (const path of walk(PRODUCTION_ROOT)) {
      if (!isCandidateFile(path)) continue;
      const rel = relative('.', path);
      if (ALLOWLIST_FILES.has(rel)) continue;

      const lines = readFileSync(path, 'utf8').split('\n');
      lines.forEach((line, idx) => {
        if (STRING_PAGINATION.test(line)) {
          offenders.push({ file: rel, line: idx + 1, snippet: line.trim() });
        }
      });
    }

    if (offenders.length > 0) {
      const report = offenders.map((o) => `  - ${o.file}:${o.line}\n      ${o.snippet}`).join('\n');
      expect.unreachable(
        `${offenders.length} pagination param(s) declared as z.string():\n\n${report}\n\nReplace with z.coerce.number().int() or reuse PaginationQuerySchema from\nshared-kernel/schemas/common/api.types.ts.\nCursors stay z.string() (opaque), but cursor != page/limit.\n`,
      );
    }

    expect(offenders).toEqual([]);
  });
});
