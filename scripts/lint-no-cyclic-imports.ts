#!/usr/bin/env bun
/**
 * Cat 5 #8: forbid cyclic imports between modules. Cycles break HMR,
 * make tree-shaking unreliable, often hide premature coupling, and
 * occasionally produce undefined-at-import-time bugs that survive
 * type checking.
 *
 * Algorithm: build a directed import graph for `src/**\/*.ts`,
 * compute strongly-connected components via Tarjan, fail when any
 * SCC has size > 1 (a true cycle) or when a node imports itself.
 *
 * Path resolution: only relative imports (`./` / `../`) and
 * tsconfig-style `@/` alias (mapped to `src/`) are followed. External
 * package imports are ignored. Resolution tries `.ts` / `.tsx` /
 * `/index.ts` in that order, matching tsc behaviour for this repo's
 * `moduleResolution`.
 *
 * Baseline: cycles count is captured per-SCC, so if a future cleanup
 * removes one cycle the lint accepts it (and `UPDATE_BASELINE=1`
 * recaptures).
 *
 * Run: bun run scripts/lint-no-cyclic-imports.ts
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');
const BASELINE_PATH = resolve(ROOT, 'scripts/lint-no-cyclic-imports.baseline.txt');
const IMPORT_RE = /(?:^|\s)(?:import|export)(?:\s+type)?\s+[^'"`;]*?from\s+['"`]([^'"`]+)['"`]/g;
const BARE_IMPORT_RE = /(?:^|\s)import\s+['"`]([^'"`]+)['"`]/g;
const ALIAS_PREFIX = '@/';

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'node_modules' || entry === 'generated') continue;
    const full = join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) yield* walk(full);
    else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.d.ts')
    )
      yield full;
  }
}

function resolveImport(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.') && !spec.startsWith(ALIAS_PREFIX)) return null;
  let absSpec: string;
  if (spec.startsWith(ALIAS_PREFIX)) {
    absSpec = join(SRC, spec.slice(ALIAS_PREFIX.length));
  } else {
    absSpec = resolve(dirname(fromFile), spec);
  }
  for (const candidate of [absSpec, `${absSpec}.ts`, `${absSpec}.tsx`, join(absSpec, 'index.ts')]) {
    try {
      const st = statSync(candidate);
      if (st.isFile()) return candidate;
    } catch {
      // fall through
    }
  }
  return null;
}

const graph = new Map<string, Set<string>>();
for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8');
  const deps = new Set<string>();
  IMPORT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const resolved = resolveImport(file, m[1]);
    if (resolved && resolved !== file) deps.add(resolved);
  }
  BARE_IMPORT_RE.lastIndex = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
  while ((m = BARE_IMPORT_RE.exec(src)) !== null) {
    const resolved = resolveImport(file, m[1]);
    if (resolved && resolved !== file) deps.add(resolved);
  }
  graph.set(file, deps);
}

// Tarjan SCC
type Tarjan = { index: number; lowlink: number; onStack: boolean };
const meta = new Map<string, Tarjan>();
const stack: string[] = [];
const sccs: string[][] = [];
let nextIndex = 0;

function strongconnect(v: string): void {
  meta.set(v, { index: nextIndex, lowlink: nextIndex, onStack: true });
  nextIndex++;
  stack.push(v);
  for (const w of graph.get(v) ?? []) {
    if (!graph.has(w)) continue;
    const wMeta = meta.get(w);
    if (!wMeta) {
      strongconnect(w);
      const wNow = meta.get(w);
      if (wNow) {
        const vMeta = meta.get(v);
        if (vMeta) vMeta.lowlink = Math.min(vMeta.lowlink, wNow.lowlink);
      }
    } else if (wMeta.onStack) {
      const vMeta = meta.get(v);
      if (vMeta) vMeta.lowlink = Math.min(vMeta.lowlink, wMeta.index);
    }
  }
  const vMeta = meta.get(v);
  if (vMeta && vMeta.lowlink === vMeta.index) {
    const scc: string[] = [];
    let w: string | undefined;
    do {
      w = stack.pop();
      if (!w) break;
      const wm = meta.get(w);
      if (wm) wm.onStack = false;
      scc.push(w);
    } while (w !== v);
    sccs.push(scc);
  }
}

for (const v of graph.keys()) {
  if (!meta.has(v)) strongconnect(v);
}

const cycles = sccs.filter((scc) => scc.length > 1);
// Self-loops: a node that imports itself (rare but possible).
const selfLoops = [...graph.entries()].filter(([k, deps]) => deps.has(k)).map(([k]) => k);

const totalIssues = cycles.length + selfLoops.length;

if (process.env.UPDATE_BASELINE === '1') {
  writeFileSync(BASELINE_PATH, `${totalIssues}\n`);
  console.log(`[no-cyclic-imports] baseline updated to ${totalIssues}`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH) ? Number(readFileSync(BASELINE_PATH, 'utf8').trim()) : 0;

if (totalIssues > baseline) {
  console.error(
    `lint-no-cyclic-imports: regression — ${totalIssues - baseline} new cycle(s). ` +
      `Total ${totalIssues} (baseline ${baseline}).`,
  );
  if (selfLoops.length > 0) {
    console.error('\nSelf-imports:');
    for (const s of selfLoops) console.error(`  ${relative(ROOT, s)}`);
  }
  if (cycles.length > 0) {
    console.error('\nCycles (each block is one SCC):');
    for (const scc of cycles.slice(0, 5)) {
      console.error('  ┌');
      for (const f of scc) console.error(`  │  ${relative(ROOT, f)}`);
      console.error('  └');
    }
    if (cycles.length > 5) console.error(`  …and ${cycles.length - 5} more`);
  }
  console.error(
    '\nBreak the cycle: extract the shared symbol into a third module, or invert the dependency via a port.',
  );
  process.exit(1);
}
console.log(
  `lint-no-cyclic-imports: ${totalIssues} cycle(s) (baseline ${baseline}), within budget`,
);
