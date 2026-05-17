#!/usr/bin/env bun
/**
 * Flags BC-local `CACHE_TTL`-style constants. The canonical source is
 * `CACHE_PRESETS` in `shared-kernel/cache/cache-ttl.const.ts`. BCs
 * defining their own TTL constants drift cache policy across BCs and
 * make the source of truth unfindable.
 *
 * The check looks for top-level `const CACHE_TTL = ...` /
 * `const CACHE_TTL_<X> = ...` declarations in BC source. Imports of
 * `CACHE_PRESETS` are obviously fine.
 *
 * Inline escape: `// lint-allow-bc-cache-ttl: <reason>`.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const BCS = join(ROOT, 'src/bounded-contexts');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'testing', '__mocks__']);
const PATTERN = /\b(?:const|let|var)\s+CACHE_TTL(?:_[A-Z0-9_]+)?\s*[:=]/;
// `platform/common/cache` is the cache infrastructure layer that
// owns CACHE_PRESETS itself; declarations there are canonical.
const ALLOWED_PREFIXES = ['platform/common/cache/'];
const ESCAPE = /lint-allow-bc-cache-ttl:\s*\S/;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    if (entry.endsWith('.spec.ts') || entry.endsWith('.test.ts')) continue;
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) walk(abs, acc);
    else if (entry.endsWith('.ts')) acc.push(abs);
  }
  return acc;
}

const offenders: Array<{ path: string; line: number; snippet: string }> = [];
for (const file of walk(BCS)) {
  const rel = relative(BCS, file);
  if (ALLOWED_PREFIXES.some((p) => rel.startsWith(p))) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!PATTERN.test(lines[i])) continue;
    // Escape token accepted on the offending line OR on the next line
    // (Biome may move trailing comments down when the line gets long).
    if (ESCAPE.test(lines[i])) continue;
    if (i + 1 < lines.length && ESCAPE.test(lines[i + 1])) continue;
    offenders.push({ path: relative(ROOT, file), line: i + 1, snippet: lines[i].trim() });
  }
}

if (offenders.length === 0) {
  console.log('lint-no-bc-cache-ttl: 0 violations.');
  process.exit(0);
}
console.error(`lint-no-bc-cache-ttl: ${offenders.length} violation(s):`);
for (const o of offenders) console.error(`  ${o.path}:${o.line}  ${o.snippet}`);
console.error('\nUse CACHE_PRESETS from shared-kernel/cache/cache-ttl.const.ts.');
process.exit(1);
