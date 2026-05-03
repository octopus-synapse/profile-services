#!/usr/bin/env bun
/**
 * Etapa 4 helper — extrai consts/funções/types/interfaces top-level de um
 * *.routes.ts (que tipicamente são schemas Zod + helpers + types) para um
 * arquivo `*.routes.schemas.ts` ao lado, e re-importa.
 *
 * Heurística: tudo entre o último import e o primeiro `export const ...Routes`
 * (ou `export const ...:.*ReadonlyArray<Route`) vai pra schemas. Adiciona
 * `export` em const/function/type/interface declarations e injeta um import
 * bloco com todos os símbolos extraídos.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const target = process.argv[2];
if (!target) {
  console.error('Uso: bun scripts/codemods/extract-route-schemas.ts <path>');
  process.exit(1);
}

const original = readFileSync(target, 'utf8');
const lines = original.split('\n');

// 1. Find last import line
let lastImportLine = 0;
for (let i = 0; i < lines.length; i++) {
  if (/^import\s|^}\s*from\s+['"]/.test(lines[i]!)) lastImportLine = i;
}

// 2. Find first export const ...Routes / : ReadonlyArray<Route... (start of route arrays)
let firstRouteLine = -1;
for (let i = lastImportLine + 1; i < lines.length; i++) {
  if (
    /^export\s+const\s+\w*[Rr]outes?\s*[:=]/.test(lines[i]!) ||
    /^export\s+const\s+\w+\s*:\s*ReadonlyArray<Route/.test(lines[i]!)
  ) {
    firstRouteLine = i;
    break;
  }
}

if (firstRouteLine === -1) {
  console.error(`${target}: não achei início do array de routes`);
  process.exit(2);
}

// 3. Slice schemas block
const schemasLines = lines.slice(lastImportLine + 1, firstRouteLine);
const _schemasBlock = schemasLines.join('\n');

// 4. Extract symbol names (const X = ..., function X(...), type X = ..., interface X { ... })
const symbols = new Set<string>();
for (const line of schemasLines) {
  // const X / let X / var X (top-level only)
  const constMatch = line.match(/^(?:const|let|var)\s+(\w+)/);
  if (constMatch) symbols.add(constMatch[1]!);
  // function X
  const funcMatch = line.match(/^(?:async\s+)?function\s+\*?\s*(\w+)/);
  if (funcMatch) symbols.add(funcMatch[1]!);
  // type X
  const typeMatch = line.match(/^type\s+(\w+)/);
  if (typeMatch) symbols.add(typeMatch[1]!);
  // interface X
  const interfaceMatch = line.match(/^interface\s+(\w+)/);
  if (interfaceMatch) symbols.add(interfaceMatch[1]!);
  // class X
  const classMatch = line.match(/^class\s+(\w+)/);
  if (classMatch) symbols.add(classMatch[1]!);
  // enum X
  const enumMatch = line.match(/^enum\s+(\w+)/);
  if (enumMatch) symbols.add(enumMatch[1]!);
}

if (symbols.size === 0) {
  console.error(`${target}: nenhum símbolo extraível`);
  process.exit(3);
}

// 5. Build schemas file content (add export to declarations)
const exportedBlock = schemasLines
  .map((l) =>
    l
      .replace(/^const /, 'export const ')
      .replace(/^let /, 'export let ')
      .replace(/^var /, 'export var ')
      .replace(/^(async\s+)?function /, 'export $1function ')
      .replace(/^type /, 'export type ')
      .replace(/^interface /, 'export interface ')
      .replace(/^class /, 'export class ')
      .replace(/^enum /, 'export enum '),
  )
  .join('\n');

// Keep all the original imports — biome organize-imports will clean up
const originalImportLines = lines.slice(0, lastImportLine + 1).join('\n');

const schemasContent = `${originalImportLines}\n${exportedBlock}\n`;

const schemasPath = target.replace(/\.routes\.ts$/, '.routes.schemas.ts');
writeFileSync(schemasPath, schemasContent);

// 6. Build new routes file — header + import block + routes arrays
const sortedSymbols = [...symbols].sort();
const importBlock = `import {\n${sortedSymbols.map((s) => `  ${s},`).join('\n')}\n} from './${basename(schemasPath, '.ts')}';`;

const headerLines = lines.slice(0, lastImportLine + 1);
const arrayLines = lines.slice(firstRouteLine);
const newRoutes = [...headerLines, importBlock, '', ...arrayLines].join('\n');

writeFileSync(target, newRoutes);

console.log(`✓ ${target}`);
console.log(`  → ${schemasPath} (${symbols.size} symbols)`);
