#!/usr/bin/env bun
/**
 * Threads `logger: LoggerPort` through composition functions:
 *  1. add LoggerPort import + `logger: LoggerPort` param to the exported
 *     `build*UseCases` / similar function;
 *  2. inside the function body, append `, logger` to every `new XYZ(...)`
 *     constructor call whose arity bumped by 1 due to logger injection.
 *
 * Usage:
 *   bun scripts/thread-logger-compositions.ts            # dry-run
 *   bun scripts/thread-logger-compositions.ts --write
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dirname, '..');
const WRITE = process.argv.includes('--write');

// 1. Pull TS errors and pick distinct *.composition.ts files.
const tscOut = execSync('bun run typecheck 2>&1 || true', { cwd: REPO, encoding: 'utf8' });
const files = new Set<string>();
for (const line of tscOut.split('\n')) {
  const m = /^(src\/[^(]+\.composition\.ts)\(/.exec(line);
  if (m) files.add(m[1]);
}

let touched = 0;
for (const rel of files) {
  const path = join(REPO, rel);
  let src = readFileSync(path, 'utf8');

  // Add LoggerPort import.
  if (!/\bLoggerPort\b/.test(src)) {
    const sk = /import\s+(?:type\s+)?\{\s*([^}]*?)\s*\}\s*from\s*(['"])@\/shared-kernel\2;?/;
    if (sk.test(src)) {
      src = src.replace(sk, (_m, inner: string, q: string) => {
        const items = inner
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (!items.includes('LoggerPort')) items.push('LoggerPort');
        items.sort();
        return `import { ${items.join(', ')} } from ${q}@/shared-kernel${q};`;
      });
    } else {
      const importStmtRe = /import[\s\S]*?from\s*['"][^'"]+['"];?/g;
      let lastEnd = -1;
      let im: RegExpExecArray | null;
      while ((im = importStmtRe.exec(src))) lastEnd = im.index + im[0].length;
      const line = `import { LoggerPort } from '@/shared-kernel';`;
      if (lastEnd >= 0) src = `${src.slice(0, lastEnd)}\n${line}${src.slice(lastEnd)}`;
      else src = `${line}\n${src}`;
    }
  }

  // Append `logger: LoggerPort` to the FIRST exported function signature.
  const fnRe = /export\s+function\s+(build\w+|create\w+|make\w+)\s*\(([\s\S]*?)\)\s*:/;
  const m = fnRe.exec(src);
  if (!m) continue;
  const innerRaw = m[2];
  if (/\blogger\s*:\s*LoggerPort\b/.test(innerRaw)) {
    // Already has logger param, but constructor calls might still need updating.
  } else {
    const isMulti = innerRaw.includes('\n');
    let newInner: string;
    if (innerRaw.trim() === '') newInner = `logger: LoggerPort`;
    else if (isMulti) {
      const lead = innerRaw.match(/\n([ \t]+)/)?.[1] ?? '  ';
      const tail = innerRaw.trimEnd().endsWith(',')
        ? innerRaw.replace(/\s*$/, '')
        : `${innerRaw.replace(/\s*$/, '')},`;
      newInner = `${tail}\n${lead}logger: LoggerPort,\n${innerRaw.match(/\n([ \t]*)$/)?.[1] ?? ''}`;
    } else newInner = `${innerRaw}, logger: LoggerPort`;
    src = src.replace(fnRe, (full) => full.replace(m[2], newInner));
  }

  // Inside the function body, find every `new ClassName(...)` call and
  // append `, logger` if the class is one we know was bumped.
  // Heuristic: look for `*UseCase` and `*Repository` and `*Adapter` /
  // `*Service` constructors. We only append when we're inside the body
  // of a composition function (between its `{` and matching `}`).
  src = transformBody(src);

  if (WRITE) writeFileSync(path, src);
  touched += 1;
  console.log(`  ✓ ${rel}`);
}

function transformBody(src: string): string {
  // Find each top-level exported function block and rewrite ` new XYZ(` calls.
  let out = '';
  let i = 0;
  while (i < src.length) {
    const fnIdx = src.slice(i).search(/export\s+function\s+\w+\s*\([^)]*\)\s*:/);
    if (fnIdx === -1) {
      out += src.slice(i);
      break;
    }
    const absFn = i + fnIdx;
    const openBraceIdx = src.indexOf('{', absFn);
    if (openBraceIdx === -1) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, openBraceIdx + 1);
    // Walk to matching closing brace.
    let depth = 1;
    let j = openBraceIdx + 1;
    let inStr: string | null = null;
    let inTpl = false;
    for (; j < src.length; j++) {
      const ch = src[j],
        prev = src[j - 1];
      if (inTpl) {
        if (ch === '`' && prev !== '\\') inTpl = false;
        continue;
      }
      if (inStr) {
        if (ch === inStr && prev !== '\\') inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inStr = ch;
        continue;
      }
      if (ch === '`') {
        inTpl = true;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    const body = src.slice(openBraceIdx + 1, j);
    const rewritten = appendLoggerToCalls(body);
    out += `${rewritten}}`;
    i = j + 1;
  }
  return out;
}

function appendLoggerToCalls(body: string): string {
  // Append `, logger` to the LAST argument list of every `new ClassName(...)`
  // call where `ClassName` matches a known suffix. We do a balanced-paren
  // walk so nested calls are tolerated.
  const constructorPattern =
    /\bnew\s+([A-Z][A-Za-z0-9_]*?(?:UseCase|Adapter|Repository|Service|Worker|Handler|Filter|Guard|Gateway|Processor|Helper))\s*\(/g;
  let out = '';
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = constructorPattern.exec(body)) !== null) {
    out += body.slice(i, m.index + m[0].length);
    const open = m.index + m[0].length - 1;
    const close = matchingParen(body, open);
    if (close === -1) {
      i = m.index + m[0].length;
      continue;
    }
    const args = body.slice(open + 1, close);
    // Skip if `logger` already appears at the end.
    const lastBit = args.trimEnd().slice(-32);
    if (/\blogger\s*$/.test(lastBit)) {
      out += body.slice(open + 1, close + 1);
    } else if (args.trim() === '') {
      out += `logger)`;
    } else {
      const trimmed = args.replace(/\s*,?\s*$/, '');
      out += `${trimmed}, logger)`;
    }
    i = close + 1;
  }
  out += body.slice(i);
  return out;
}

function matchingParen(src: string, openIdx: number): number {
  let depth = 0;
  let inStr: string | null = null;
  let inTpl = false;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i],
      prev = src[i - 1];
    if (inTpl) {
      if (ch === '`' && prev !== '\\') inTpl = false;
      continue;
    }
    if (inStr) {
      if (ch === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      continue;
    }
    if (ch === '`') {
      inTpl = true;
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

console.log(`\nTouched: ${touched} composition files (${WRITE ? 'WRITE' : 'dry-run'})`);
