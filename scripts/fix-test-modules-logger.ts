#!/usr/bin/env bun
/**
 * Inject a `{ provide: LoggerPort, useValue: stub }` provider into every
 * `Test.createTestingModule({ providers: [...] })` block whose graph
 * transitively depends on the migrated services. We do it broadly: any
 * spec that builds a Nest TestingModule and doesn't already register
 * LoggerPort gets one.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO = join(import.meta.dirname, '..');
const SRC = join(REPO, 'src');

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (st.isFile() && entry.endsWith('.spec.ts')) yield full;
  }
}

const STUB_PROVIDER = `{ provide: LoggerPort, useValue: { log: () => {}, debug: () => {}, warn: () => {}, error: () => {} } }`;

let touched = 0;
for (const path of walk(SRC)) {
  const rel = relative(SRC, path).replace(/\\/g, '/');
  let src = readFileSync(path, 'utf8');

  if (!/Test\.createTestingModule\s*\(/.test(src)) continue;
  if (src.includes('LoggerPort')) continue; // already wired

  // Need to ensure the file imports LoggerPort.
  const importStmtRe = /import[\s\S]*?from\s*['"][^'"]+['"];?/g;
  let lastEnd = -1;
  let im: RegExpExecArray | null;
  while ((im = importStmtRe.exec(src))) lastEnd = im.index + im[0].length;
  if (lastEnd < 0) continue;
  src = `${src.slice(0, lastEnd)}\nimport { LoggerPort } from '@/shared-kernel/logger';${src.slice(lastEnd)}`;

  // Append the LoggerPort provider into each providers: [ ... ] array
  // inside Test.createTestingModule. Match the open-bracket and walk to
  // its matching close-bracket so we can splice in one line.
  let out = '';
  let i = 0;
  const needle = 'providers:';
  while (i < src.length) {
    const idx = src.indexOf(needle, i);
    if (idx === -1) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, idx);
    const openIdx = src.indexOf('[', idx);
    if (openIdx === -1) {
      out += src.slice(idx);
      break;
    }
    // find matching ]
    let depth = 0;
    let close = -1;
    let inStr: string | null = null;
    let inBack = false;
    for (let j = openIdx; j < src.length; j++) {
      const ch = src[j],
        prev = src[j - 1];
      if (inBack) {
        if (ch === '`' && prev !== '\\') inBack = false;
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
        inBack = true;
        continue;
      }
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          close = j;
          break;
        }
      }
    }
    if (close === -1) {
      out += src.slice(idx);
      break;
    }
    const inner = src.slice(openIdx + 1, close).trimEnd();
    const sep = inner.length === 0 ? '' : inner.endsWith(',') ? ' ' : ', ';
    const newInner = `${inner}${sep}${STUB_PROVIDER}`;
    out += `${src.slice(idx, openIdx + 1)}${newInner}${src.slice(close, close + 1)}`;
    i = close + 1;
  }
  src = out;
  writeFileSync(path, src);
  touched += 1;
  console.log(`✓ ${rel}`);
}
console.log(`\nTotal: ${touched} spec files patched.`);
