/**
 * Paginated-response helper enforcement
 *
 * Every route or use-case that returns the canonical paginated envelope
 * (`{items, total, page, limit, totalPages, hasNext, hasPrev}`) must build
 * it via one of the two shared helpers in
 * `shared-kernel/schemas/common/build-paginated-response.ts`:
 *
 *  - `buildPaginatedResponse(items, total, {page, limit})` — for routes
 *    truly paginated server-side (a service/repo that knows total).
 *  - `buildFixedListResponse(items)` — for routes that return every item
 *    in one shot (small fixed lists like user skills).
 *
 * Hand-rolling `totalPages: …, hasNext: …, hasPrev: …` inline drifts the
 * envelope semantics (one site rounds, another floors; one defaults
 * `hasNext` to false on empty, another to true). Forcing every site
 * through the helpers locks the envelope shape to one place.
 *
 * Detection: any `*.routes.ts` / `*.use-case.ts` / `*.service.ts` /
 * `*.presenter.ts` under `src/bounded-contexts/` that mentions
 * `totalPages:` (the unambiguous envelope marker) MUST also import one
 * of the helpers. Otherwise the file is constructing the envelope by
 * hand and the test fails.
 *
 * The helpers themselves are exempt (they declare `totalPages:`
 * internally). The shared-kernel ports/types files are exempt (they
 * define the type, not produce instances).
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const PRODUCTION_ROOT = 'src';
const HELPER_FILE = 'src/shared-kernel/schemas/common/build-paginated-response.ts';

const ENVELOPE_MARKER = /(^|\s)totalPages\s*:/m;
const HELPER_IMPORT = /\b(buildPaginatedResponse|buildFixedListResponse)\b/;

const FILE_SUFFIXES = ['.routes.ts', '.use-case.ts', '.service.ts', '.presenter.ts'];

const SKIP_PATH_FRAGMENTS = ['__tests__', '__mocks__', '/testing/', '.spec.ts', '.test.ts'];

const ALLOWLIST_FILES = new Set<string>([
  HELPER_FILE,
  // Type/schema declarations that shape `PaginatedResponse<T>` itself —
  // they describe the envelope, they don't produce instances.
  'src/shared-kernel/schemas/common/api.types.ts',
  'src/shared-kernel/database/paginate.ts',
  // Database paginate helper — also a centralized primitive that builds
  // the envelope from a Prisma query. Counts as a third helper.
  // Allowlisting it keeps the test honest about its scope.
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

describe('Paginated-response helper enforcement', () => {
  it('every envelope-producing site routes through buildPaginatedResponse or buildFixedListResponse', () => {
    const offenders: string[] = [];

    for (const path of walk(PRODUCTION_ROOT)) {
      if (!isCandidateFile(path)) continue;
      const rel = relative('.', path);
      if (ALLOWLIST_FILES.has(rel)) continue;

      const content = readFileSync(path, 'utf8');
      if (!ENVELOPE_MARKER.test(content)) continue;
      if (HELPER_IMPORT.test(content)) continue;

      offenders.push(rel);
    }

    if (offenders.length > 0) {
      const list = offenders.map((p) => `  - ${p}`).join('\n');
      expect.unreachable(
        `${offenders.length} file(s) build the paginated envelope (\`totalPages: …\`) by hand instead of going through buildPaginatedResponse / buildFixedListResponse:\n\n${list}\n\nRefactor each to import one of the helpers from\n  src/shared-kernel/schemas/common/build-paginated-response.ts\nor add an explicit allowlist entry with justification if the file is a third canonical builder.\n`,
      );
    }

    expect(offenders).toEqual([]);
  });

  it('helper file itself stays the only place that hand-rolls totalPages math', () => {
    const helper = readFileSync(HELPER_FILE, 'utf8');
    expect(helper).toMatch(/buildPaginatedResponse/);
    expect(helper).toMatch(/buildFixedListResponse/);
    expect(helper).toMatch(/totalPages/);
  });

  it('walk function actually visits the production tree', () => {
    let visited = 0;
    for (const path of walk(PRODUCTION_ROOT)) {
      if (statSync(path).isFile()) visited++;
      if (visited > 100) break;
    }
    expect(visited).toBeGreaterThan(100);
  });
});
