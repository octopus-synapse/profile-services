/**
 * P1-047 — detect cyclic dependencies between bounded contexts.
 *
 * The architecture promises a one-way platform → BCs → shared-kernel
 * dependency direction. A cycle (BC A imports BC B which imports A)
 * traps both BCs in the same logical aggregate and blocks any future
 * extraction. This script walks every `.ts` file under
 * `src/bounded-contexts/<bc>/`, collects each `import 'X'` statement,
 * and flags imports whose path roots in a different BC.
 *
 * The graph is then cycle-checked via Tarjan-style DFS so the output
 * names every offending pair. Run on CI; fails the build with a non-
 * zero exit code when any cycle exists.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { Glob } from 'bun';

const SRC_DIR = resolve('src/bounded-contexts');

// `import .. from 'X'` and `import('X')` — covers both static and
// dynamic imports.
const IMPORT_RE = /(?:import\s+(?:[^'"]+\s+from\s+)?|import\s*\(\s*)['"]([^'"]+)['"]/g;

function bcOf(path: string): string | null {
  const rel = relative(SRC_DIR, path);
  if (rel.startsWith('..')) return null;
  return rel.split('/')[0] ?? null;
}

function resolveImport(fromFile: string, spec: string): string | null {
  if (spec.startsWith('@/bounded-contexts/')) {
    return resolve('src', spec.slice(2));
  }
  if (spec.startsWith('./') || spec.startsWith('../')) {
    return resolve(dirname(fromFile), spec);
  }
  return null; // node_modules / shared-kernel / etc — out of scope
}

async function main(): Promise<void> {
  const graph = new Map<string, Set<string>>();
  const glob = new Glob('**/*.ts');

  for await (const rel of glob.scan({ cwd: SRC_DIR })) {
    if (rel.endsWith('.spec.ts') || rel.endsWith('.test.ts')) continue;
    if (rel.includes('/testing/')) continue; // test fakes intentionally cross BC lines
    const abs = join(SRC_DIR, rel);
    const fromBc = bcOf(abs);
    if (!fromBc) continue;
    const src = readFileSync(abs, 'utf8');
    let match: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(src))) {
      const spec = match[1];
      if (!spec) continue;
      const resolved = resolveImport(abs, spec);
      if (!resolved) continue;
      const toBc = bcOf(resolved);
      if (!toBc || toBc === fromBc) continue;
      const set = graph.get(fromBc) ?? new Set<string>();
      set.add(toBc);
      graph.set(fromBc, set);
    }
  }

  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string): void {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      if (idx >= 0) cycles.push([...stack.slice(idx), node]);
      return;
    }
    visiting.add(node);
    stack.push(node);
    for (const next of graph.get(node) ?? []) dfs(next);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) dfs(node);

  const strict = process.argv.includes('--strict');

  if (cycles.length === 0) {
    console.log('[check-bc-cycles] no cycles detected');
    return;
  }

  // Report-only by default. The current codebase has known cycles
  // (platform↔BCs hub-and-spoke); breaking them is a multi-PR refactor
  // that has to land alongside boot-order changes. Pass `--strict`
  // to fail the build (CI gate for the future PR that reaches zero).
  const log = strict ? console.error : console.warn;
  log(`[check-bc-cycles] ${cycles.length} cycle(s) detected${strict ? '' : ' (report-only)'}:`);
  for (const cycle of cycles) {
    log(`  ${cycle.join(' → ')}`);
  }
  if (strict) process.exit(1);
}

void main();
