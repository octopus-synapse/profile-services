#!/usr/bin/env bun
/**
 * Injects `private readonly logger: LoggerPort` as the last constructor
 * argument in every file flagged by the coverage audit, and adds the
 * matching `import { LoggerPort } from '@/shared-kernel'` line.
 *
 * The module wiring (useFactory + inject) is NOT touched here — running
 * the type checker afterwards exposes every factory that needs an extra
 * dep, and we patch those in a follow-up pass. Doing it that way keeps
 * the script honest: it only does the safe local transform.
 *
 * Usage:
 *   bun scripts/inject-logger-port.ts            # dry-run
 *   bun scripts/inject-logger-port.ts --write
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO = join(import.meta.dirname, '..');
const SRC = join(REPO, 'src');
const WRITE = process.argv.includes('--write');

const INFRA_HINTS = [
  /\bfetch\s*\(/, /from\s+['"]@prisma\/client['"]/, /\bnew\s+PrismaClient\b/,
  /from\s+['"]openai['"]/, /from\s+['"]puppeteer['"]/, /from\s+['"]bullmq['"]/,
  /from\s+['"]@nestjs\/bullmq['"]/, /from\s+['"]ioredis['"]/, /from\s+['"]nodemailer['"]/,
  /from\s+['"]minio['"]/, /from\s+['"]aws-sdk['"]/,
];

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

function isCandidate(rel: string, src: string): { kind: string; ok: boolean } | null {
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  if (/application\/use-cases\//.test(rel) && rel.endsWith('.use-case.ts')) {
    const shape = readConstructor(stripped);
    if (shape && shape.paramCount >= 2 && !shape.injectsLogger) return { kind: 'use-case', ok: true };
  }
  if (
    /infrastructure\/(adapters|services|repositories|workers)\//.test(rel) ||
    rel.endsWith('.adapter.ts') || rel.endsWith('.repository.ts')
  ) {
    const touch = INFRA_HINTS.some((re) => re.test(stripped));
    const shape = readConstructor(stripped);
    if (touch && shape && !shape.injectsLogger) return { kind: 'infra', ok: true };
  }
  if ((/application\/handlers\//.test(rel) || rel.endsWith('.handler.ts')) && !rel.endsWith('.use-case.ts')) {
    const shape = readConstructor(stripped);
    if (shape && !shape.injectsLogger) return { kind: 'handler', ok: true };
  }
  return null;
}

interface Shape { paramCount: number; injectsLogger: boolean; }

function readConstructor(src: string): Shape | null {
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

let touched = 0;
const skips: { rel: string; reason: string }[] = [];

for (const path of walk(SRC)) {
  const rel = relative(SRC, path).replace(/\\/g, '/');
  const original = readFileSync(path, 'utf8');
  const cand = isCandidate(rel, original);
  if (!cand) continue;

  // Locate the constructor in the LIVE source (not the stripped one)
  // so we can splice without losing comments around the ctor.
  const ctorRe = /constructor\s*\(([\s\S]*?)\)\s*\{/;
  const m = ctorRe.exec(original);
  if (!m) { skips.push({ rel, reason: 'no constructor (needs manual injection)' }); continue; }
  const innerRaw = m[1];
  const innerTrim = innerRaw.trim();

  // Decide indentation style by looking at how params are laid out.
  const isMultiline = innerRaw.includes('\n');
  let newInner: string;
  if (innerTrim.length === 0) {
    newInner = `private readonly logger: LoggerPort`;
  } else if (isMultiline) {
    // Match the leading whitespace of the FIRST param to keep the block aligned.
    const leadMatch = innerRaw.match(/\n([ \t]+)/);
    const lead = leadMatch ? leadMatch[1] : '    ';
    const tail = innerRaw.endsWith(',') || innerRaw.trimEnd().endsWith(',')
      ? innerRaw.replace(/\s*$/, '')
      : `${innerRaw.replace(/\s*$/, '')},`;
    newInner = `${tail}\n${lead}private readonly logger: LoggerPort,\n${(innerRaw.match(/\n([ \t]*)$/)?.[1]) ?? ''}`;
  } else {
    newInner = `${innerTrim}, private readonly logger: LoggerPort`;
  }

  const newCtor = `constructor(${newInner}) {`;
  let mutated = original.slice(0, m.index) + newCtor + original.slice(m.index + m[0].length);

  // Add the LoggerPort import if absent.
  if (!/\bLoggerPort\b/.test(mutated.replace(newCtor, ''))) {
    const sharedKernelImport = /import\s*\{\s*([^}]*?)\s*\}\s*from\s*(['"])@\/shared-kernel\2;?/;
    if (sharedKernelImport.test(mutated)) {
      mutated = mutated.replace(sharedKernelImport, (_m, inner: string, q: string) => {
        const items = inner.split(',').map((s) => s.trim()).filter(Boolean);
        if (!items.includes('LoggerPort')) items.push('LoggerPort');
        items.sort();
        return `import { ${items.join(', ')} } from ${q}@/shared-kernel${q};`;
      });
    } else {
      // Place after the LAST import statement.
      const importStmtRe = /import[\s\S]*?from\s*['"][^'"]+['"];?/g;
      let lastEnd = -1; let im: RegExpExecArray | null;
      while ((im = importStmtRe.exec(mutated))) lastEnd = im.index + im[0].length;
      const line = `import { LoggerPort } from '@/shared-kernel';`;
      if (lastEnd >= 0) {
        mutated = `${mutated.slice(0, lastEnd)}\n${line}${mutated.slice(lastEnd)}`;
      } else {
        mutated = `${line}\n${mutated}`;
      }
    }
  }

  if (WRITE) writeFileSync(path, mutated);
  touched += 1;
  console.log(`  + [${cand.kind}] ${rel}`);
}

console.log(`\nTouched: ${touched} files (${WRITE ? 'WRITE' : 'dry-run'})`);
if (skips.length) {
  console.log(`Skipped: ${skips.length}`);
  skips.forEach((s) => console.log(`  ✗ ${s.rel} — ${s.reason}`));
}
