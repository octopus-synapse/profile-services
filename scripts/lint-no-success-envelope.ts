#!/usr/bin/env bun
/**
 * Flags `return { success: false, ... }` shapes in route handlers.
 * The convention is throw a domain exception; HTTP status carries
 * "error". Inline `{success: false}` skips i18n rendering and breaks
 * parity with the mounter's error envelope.
 *
 * Inline escape: `// lint-allow-success-envelope: <reason>`.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'testing', '__mocks__']);
const PATTERN = /\breturn\s*{[^}]*success:\s*false/;
const ESCAPE = /\/\/\s*lint-allow-success-envelope:\s*\S/;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    if (entry.endsWith('.spec.ts') || entry.endsWith('.test.ts')) continue;
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) walk(abs, acc);
    else if (entry.endsWith('.routes.ts')) acc.push(abs);
  }
  return acc;
}

const offenders: Array<{ path: string; line: number; snippet: string }> = [];
for (const file of walk(SRC)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!PATTERN.test(lines[i])) continue;
    if (ESCAPE.test(lines[i])) continue;
    offenders.push({ path: relative(ROOT, file), line: i + 1, snippet: lines[i].trim() });
  }
}

if (offenders.length === 0) {
  console.log('lint-no-success-envelope: 0 violations.');
  process.exit(0);
}
console.error(`lint-no-success-envelope: ${offenders.length} violation(s):`);
for (const o of offenders) console.error(`  ${o.path}:${o.line}  ${o.snippet}`);
console.error('\nThrow a domain exception instead. HTTP status carries "error".');
process.exit(1);
