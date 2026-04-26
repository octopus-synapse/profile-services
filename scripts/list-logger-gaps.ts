#!/usr/bin/env bun
/** Lists every gap surfaced by the coverage audit so we can plan the
 * cleanup. Same logic as the spec, just prints the file names. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(import.meta.dirname, '../src');

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__' || entry === 'testing') continue;
      yield* walk(full);
    } else if (
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

function read(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
}

function readConstructor(src: string) {
  const ctor = /constructor\s*\(([\s\S]*?)\)\s*\{/.exec(src);
  if (!ctor) return null;
  const inner = ctor[1];
  if (inner.trim().length === 0) return { paramCount: 0, injectsLogger: false };
  let depth = 0, inStr: string | null = null, count = 1;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i], prev = inner[i - 1];
    if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') depth++;
    if (ch === ')' || ch === ']' || ch === '}' || ch === '>') depth--;
    if (ch === ',' && depth === 0) count++;
  }
  return { paramCount: count, injectsLogger: /\bLoggerPort\b/.test(inner) };
}

const INFRA_HINTS = [
  /\bfetch\s*\(/, /from\s+['"]@prisma\/client['"]/, /\bnew\s+PrismaClient\b/,
  /from\s+['"]openai['"]/, /from\s+['"]puppeteer['"]/, /from\s+['"]bullmq['"]/,
  /from\s+['"]@nestjs\/bullmq['"]/, /from\s+['"]ioredis['"]/, /from\s+['"]nodemailer['"]/,
  /from\s+['"]minio['"]/, /from\s+['"]aws-sdk['"]/,
];

const buckets = { useCase: [] as string[], infra: [] as string[], worker: [] as string[], handler: [] as string[], silent: [] as string[] };

for (const path of walk(SRC)) {
  const rel = relative(SRC, path).replace(/\\/g, '/');
  const src = read(path);

  if (/application\/use-cases\//.test(rel) && rel.endsWith('.use-case.ts')) {
    const s = readConstructor(src);
    if (s && s.paramCount >= 2 && !s.injectsLogger) buckets.useCase.push(rel);
  }
  if (
    /infrastructure\/(adapters|services|repositories|workers)\//.test(rel) ||
    rel.endsWith('.adapter.ts') || rel.endsWith('.repository.ts')
  ) {
    const touch = INFRA_HINTS.some((re) => re.test(src));
    const s = readConstructor(src);
    if (touch && s && !s.injectsLogger) buckets.infra.push(rel);
  }
  if (rel.endsWith('.worker.ts')) {
    const hasLog = /this\.logger\.log\s*\(/.test(src);
    const hasErr = /this\.logger\.(error|warn)\s*\(/.test(src);
    if (!hasLog || !hasErr) buckets.worker.push(rel);
  }
  if ((/application\/handlers\//.test(rel) || rel.endsWith('.handler.ts')) && !rel.endsWith('.use-case.ts')) {
    const s = readConstructor(src);
    if (s && !s.injectsLogger) buckets.handler.push(rel);
  }
  const catchRe = /catch\s*(?:\([^)]*\))?\s*\{([\s\S]*?)\}/g;
  let cm: RegExpExecArray | null;
  while ((cm = catchRe.exec(src))) {
    const body = cm[1];
    if (body.split('\n').length > 12) continue;
    if (/this\.logger\./.test(body)) continue;
    if (/\bthrow\b/.test(body)) continue;
    if (body.trim().length === 0) continue;
    buckets.silent.push(rel);
    break;
  }
}

console.log(`\n=== Worker gaps (${buckets.worker.length}) ===`);
buckets.worker.forEach((f) => console.log(`  ${f}`));
console.log(`\n=== Handler gaps (${buckets.handler.length}) ===`);
buckets.handler.forEach((f) => console.log(`  ${f}`));
console.log(`\n=== Infra adapter gaps (${buckets.infra.length}) ===`);
buckets.infra.forEach((f) => console.log(`  ${f}`));
console.log(`\n=== Use-case gaps (${buckets.useCase.length}) ===`);
buckets.useCase.forEach((f) => console.log(`  ${f}`));
console.log(`\n=== Silent catches (${buckets.silent.length}) ===`);
buckets.silent.forEach((f) => console.log(`  ${f}`));
