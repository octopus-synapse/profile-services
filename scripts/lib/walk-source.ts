/**
 * Shared `.ts` file walker for repo-wide scripts and architecture
 * tests. Q64 in the duplication audit (consolidates the six divergent
 * local walkers — listFiles / walk / listSourceFiles / etc.).
 *
 * Skip rules can be overridden per call. Defaults:
 *   - skip dot-dirs
 *   - skip node_modules / testing / __mocks__ / __tests__
 *   - keep `.ts` files that aren't `.spec.ts`
 *
 * For globbing-style needs in shell scripts the project uses bash
 * `find`. Picking up `fast-glob` would force a new dep — this util
 * keeps the codebase stdlib-only.
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface WalkOptions {
  /** Directory names skipped during recursion. */
  skipDirs?: ReadonlyArray<string>;
  /** File-name predicate. Default keeps `.ts` excluding `.spec.ts`. */
  filter?: (name: string) => boolean;
}

const DEFAULT_SKIP = ['node_modules', 'testing', '__mocks__', '__tests__'];

const DEFAULT_FILTER = (name: string): boolean =>
  name.endsWith('.ts') && !name.endsWith('.spec.ts');

export function* walkSource(dir: string, opts: WalkOptions = {}): Generator<string> {
  const skip = new Set(opts.skipDirs ?? DEFAULT_SKIP);
  const filter = opts.filter ?? DEFAULT_FILTER;
  yield* walk(dir, skip, filter);
}

export function listSourceFilesArray(dir: string, opts: WalkOptions = {}): string[] {
  return [...walkSource(dir, opts)];
}

function* walk(
  dir: string,
  skip: Set<string>,
  filter: (name: string) => boolean,
): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || skip.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full, skip, filter);
    else if (filter(entry)) yield full;
  }
}
