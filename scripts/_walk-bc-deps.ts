#!/usr/bin/env bun
/**
 * Walk all dependencies (transitively) reachable from a BC's
 * `routes.ts` + `composition.ts` (or any seed file you pass). Prints
 * one absolute path per line for files INSIDE the BC that are NOT
 * reachable — i.e. the dead subgraph.
 *
 * Usage:
 *   bun scripts/_walk-bc-deps.ts <bc-path>
 *   bun scripts/_walk-bc-deps.ts src/bounded-contexts/translation
 *
 * Discardable. Run once per BC during F5.H.3.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'src');

function* walkDir(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__' || entry === 'testing') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walkDir(full);
    else if (
      st.isFile() &&
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.d.ts')
    ) {
      yield full;
    }
  }
}

function resolveImport(spec: string, fromFile: string): string | null {
  let raw: string;
  if (spec.startsWith('@/')) {
    raw = resolve(SRC, spec.replace(/^@\//, ''));
  } else if (spec.startsWith('./') || spec.startsWith('../')) {
    raw = resolve(dirname(fromFile), spec);
  } else {
    return null;
  }
  // Try direct .ts, then /index.ts, then .js fallback to .ts
  const candidates = [`${raw}.ts`, join(raw, 'index.ts'), raw.endsWith('.ts') ? raw : null].filter(
    (c): c is string => c !== null,
  );
  for (const c of candidates) {
    try {
      if (statSync(c).isFile()) return c;
    } catch {}
  }
  return null;
}

function readImports(file: string): string[] {
  const content = readFileSync(file, 'utf8');
  const specs: string[] = [];
  // Static imports + dynamic imports + re-exports.
  const patterns = [
    /import\s+[^'"]*?from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /export\s+\*\s+from\s+['"]([^'"]+)['"]/g,
    /export\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/g,
    /export\s+type\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/g,
  ];
  for (const re of patterns) {
    for (const m of content.matchAll(re)) specs.push(m[1]);
  }
  return specs;
}

function reachable(seeds: string[]): Set<string> {
  const visited = new Set<string>();
  const queue = [...seeds];
  while (queue.length > 0) {
    const file = queue.shift();
    if (!file || visited.has(file)) continue;
    visited.add(file);
    for (const spec of readImports(file)) {
      const target = resolveImport(spec, file);
      if (target && !visited.has(target)) queue.push(target);
    }
  }
  return visited;
}

function main(): void {
  const bcPath = process.argv[2];
  if (!bcPath) {
    console.error('Usage: bun scripts/_walk-bc-deps.ts <bc-path>');
    process.exit(1);
  }
  const bcAbs = isAbsolute(bcPath) ? bcPath : resolve(ROOT, bcPath);

  // Seeds: any *.routes.ts or *.composition.ts inside the BC.
  const seeds: string[] = [];
  for (const f of walkDir(bcAbs)) {
    if (f.endsWith('.routes.ts') || f.endsWith('.composition.ts')) {
      seeds.push(f);
    }
  }
  if (seeds.length === 0) {
    console.error(`No routes.ts / composition.ts found under ${bcAbs}`);
    process.exit(1);
  }

  // Walk reachability from the seeds.
  const live = reachable(seeds);

  // Print every file in the BC that is NOT in `live`.
  const dead: string[] = [];
  for (const f of walkDir(bcAbs)) {
    if (!live.has(f)) dead.push(f);
  }

  for (const f of dead.sort()) {
    console.log(relative(ROOT, f));
  }
  console.error(
    `\n[stats] BC=${relative(ROOT, bcAbs)} seeds=${seeds.length} live=${live.size} dead=${dead.length}`,
  );
}

main();
