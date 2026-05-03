#!/usr/bin/env bun
/**
 * Atualiza imports referenciando os arquivos *.exceptions.ts splitados.
 * `from '.../exceptions/{bc}.exceptions'` → `from '.../exceptions'` (= index)
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..', '..');

const replacements: Array<[RegExp, string]> = [
  [/(['"`])([^'"`]*?\/exceptions)\/resumes\.exceptions\1/g, '$1$2$1'],
  [/(['"`])([^'"`]*?\/exceptions)\/integration\.exceptions\1/g, '$1$2$1'],
  [/(['"`])([^'"`]*?\/exceptions)\/presentation\.exceptions\1/g, '$1$2$1'],
];

const SCAN_DIRS = ['src', 'test'];
const EXCLUDE = new Set(['node_modules', 'dist', '.git']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (EXCLUDE.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
let totalFiles = 0;
let totalReplacements = 0;

for (const f of files) {
  const original = readFileSync(f, 'utf8');
  let updated = original;
  let replaced = 0;
  for (const [from, to] of replacements) {
    updated = updated.replace(from, (...args) => {
      replaced++;
      return to.replace(/\$(\d)/g, (_, n) => args[Number(n)]);
    });
  }
  if (replaced > 0) {
    writeFileSync(f, updated);
    totalFiles++;
    totalReplacements += replaced;
  }
}

console.log(`${totalReplacements} imports atualizados em ${totalFiles} arquivos.`);
