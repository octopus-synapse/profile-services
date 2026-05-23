#!/usr/bin/env bun
/**
 * F1.3 — Aplica as correções identificadas em status-code-diff.json:
 * para cada (specFile, specLine, currentAssert → expected), troca o
 * literal numérico no `.toBe(<currentAssert>)` daquela linha.
 *
 * Conservador: troca apenas a primeira ocorrência de
 * `.toBe(<currentAssert>)` na linha indicada (1-based), e abortando
 * se a linha não contiver o pattern (proteção contra arquivos
 * editados entre extract e apply).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Mismatch {
  specFile: string;
  specLine: number;
  currentAssert: number;
  expected: number;
}

const INPUT = resolve('scripts/audits/status-code-diff.json');
const mismatches: Mismatch[] = JSON.parse(readFileSync(INPUT, 'utf8'));

// Group by file.
const byFile = new Map<string, Mismatch[]>();
for (const m of mismatches) {
  const arr = byFile.get(m.specFile) ?? [];
  arr.push(m);
  byFile.set(m.specFile, arr);
}

let applied = 0;
let skipped = 0;

for (const [file, fixes] of byFile) {
  const abs = resolve(file);
  const lines = readFileSync(abs, 'utf8').split('\n');
  for (const fix of fixes) {
    const idx = fix.specLine - 1;
    const original = lines[idx];
    const pattern = `.toBe(${fix.currentAssert})`;
    const replacement = `.toBe(${fix.expected})`;
    if (!original.includes(pattern)) {
      console.warn(
        `  SKIP ${file}:${fix.specLine} — line does not contain "${pattern}" — got:\n    ${original}`,
      );
      skipped++;
      continue;
    }
    // Replace only first occurrence on this line.
    lines[idx] = original.replace(pattern, replacement);
    applied++;
  }
  writeFileSync(abs, lines.join('\n'));
  console.log(`[apply-status-code-fixes] ${file}: ${fixes.length} fixes`);
}

console.log(`[apply-status-code-fixes] applied=${applied} skipped=${skipped}`);
