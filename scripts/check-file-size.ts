#!/usr/bin/env bun
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');
const BASELINE_PATH = join(ROOT, '.linecount-baseline.json');

const MAX_LINES = 150;
const EXCLUDED_SUFFIXES = ['.spec.ts', '.test.ts', '.e2e-spec.ts'];
const EXCLUDED_BASENAMES = ['index.ts'];

type Entry = { path: string; lines: number };

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

function countLines(path: string): number {
  return readFileSync(path, 'utf8').split('\n').length;
}

function isExcluded(path: string): boolean {
  const base = path.split('/').at(-1)!;
  if (EXCLUDED_BASENAMES.includes(base)) return true;
  return EXCLUDED_SUFFIXES.some((s) => path.endsWith(s));
}

function collect(): Entry[] {
  return walk(SRC)
    .filter((p) => !isExcluded(p))
    .map((p) => ({ path: relative(ROOT, p), lines: countLines(p) }))
    .filter((e) => e.lines > MAX_LINES)
    .sort((a, b) => b.lines - a.lines);
}

const args = process.argv.slice(2);
const cmd = args[0] ?? 'check';

if (cmd === 'snapshot') {
  const entries = collect();
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify({ maxLines: MAX_LINES, files: entries.map((e) => e.path) }, null, 2)}\n`,
  );
  console.log(`Snapshot escrito em ${relative(ROOT, BASELINE_PATH)}`);
  console.log(`${entries.length} arquivos > ${MAX_LINES} linhas registrados.`);
  process.exit(0);
}

if (cmd === 'list') {
  const entries = collect();
  for (const e of entries) console.log(`${String(e.lines).padStart(4)} ${e.path}`);
  console.log(`\n${entries.length} arquivos > ${MAX_LINES} linhas.`);
  process.exit(0);
}

// default: check (compare against baseline)
if (!existsSync(BASELINE_PATH)) {
  console.error(
    `Baseline ${relative(ROOT, BASELINE_PATH)} ausente. Rode: bun scripts/check-file-size.ts snapshot`,
  );
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as {
  maxLines: number;
  files: string[];
};
const allowed = new Set(baseline.files);
const current = collect();

const newOffenders = current.filter((e) => !allowed.has(e.path));
const fixed = baseline.files.filter((p) => !current.find((e) => e.path === p));

if (newOffenders.length > 0) {
  console.error(`\n  ${newOffenders.length} arquivo(s) novo(s) acima de ${MAX_LINES} linhas:\n`);
  for (const e of newOffenders) console.error(`  ${String(e.lines).padStart(4)}  ${e.path}`);
  console.error(`\nLimite por arquivo: ${MAX_LINES} linhas (excluindo *.spec.ts e index.ts).`);
  console.error(
    `Splite o arquivo ou rode: bun scripts/check-file-size.ts snapshot (apenas se intencional)\n`,
  );
  process.exit(1);
}

console.log(`OK — ${current.length} arquivos no baseline, 0 novas violações.`);
if (fixed.length > 0) {
  console.log(`${fixed.length} arquivo(s) saíram do baseline (rode 'snapshot' pra atualizar):`);
  for (const p of fixed.slice(0, 10)) console.log(`  - ${p}`);
  if (fixed.length > 10) console.log(`  ... +${fixed.length - 10}`);
}
process.exit(0);
