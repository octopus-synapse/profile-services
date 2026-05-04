#!/usr/bin/env bun
/**
 * Migrate `logger.error(msg, trace, context, meta?)` positional calls
 * to the object form `logger.error(msg, { context, stack, ...meta })`.
 *
 * Q21 in the duplication audit. Run from repo root:
 *   bun run scripts/migrate-logger-error-to-object.ts
 *
 * After the script lands every call site, the deprecated positional
 * overload on `LoggerPort.error` can be deleted.
 *
 * Conservative: only rewrites calls that match the well-known shapes:
 *   - logger.error(msg)
 *   - logger.error(msg, trace, ctx)
 *   - logger.error(msg, trace, ctx, meta)
 * It leaves anything ambiguous untouched (caller can finish manually).
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
const SKIP_DIRS = new Set(['node_modules', 'testing', '__mocks__', '__tests__']);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) yield full;
  }
}

/** Find the index of the matching `)` for the `(` at `openIdx`. */
function matchParen(src: string, openIdx: number): number {
  let depth = 0;
  let inString: string | null = null;
  let inTemplate = false;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (inTemplate) {
      if (ch === '`') inTemplate = false;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = ch;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
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

/** Split a top-level argument list into individual argument expressions. */
function splitTopLevelArgs(src: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let inString: string | null = null;
  let inTemplate = false;
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (inTemplate) {
      if (ch === '`') inTemplate = false;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = ch;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      args.push(src.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = src.slice(start).trim();
  if (tail.length > 0) args.push(tail);
  return args;
}

function rewriteFile(path: string): boolean {
  const src = readFileSync(path, 'utf8');
  if (!src.includes('.error(')) return false;

  let out = '';
  let i = 0;
  let changed = false;

  while (i < src.length) {
    // Look for `<word>.error(`
    const callRe = /(\w+)\.error\(/g;
    callRe.lastIndex = i;
    const match = callRe.exec(src);
    if (!match) {
      out += src.slice(i);
      break;
    }
    const callerEndIdx = match.index + match[0].length; // index right after `(`
    const closeIdx = matchParen(src, callerEndIdx - 1);
    if (closeIdx < 0) {
      out += src.slice(i);
      break;
    }
    const argsRaw = src.slice(callerEndIdx, closeIdx);
    const args = splitTopLevelArgs(argsRaw);

    // Skip cases that are already object-form OR have 0/1 args
    const isObjectForm = args.length >= 2 && args[1].trim().startsWith('{');
    if (args.length <= 1 || isObjectForm) {
      out += src.slice(i, closeIdx + 1);
      i = closeIdx + 1;
      continue;
    }

    // We have positional form: error(msg, trace, ctx?, meta?)
    const [msg, trace, ctx, meta] = args;
    const parts: string[] = [];
    if (ctx && ctx !== 'undefined') parts.push(`context: ${ctx}`);
    if (trace && trace !== 'undefined') parts.push(`stack: ${trace}`);
    if (meta && meta !== 'undefined') {
      // If meta is `{ ... }` literal, splat its contents; otherwise spread.
      const t = meta.trim();
      if (t.startsWith('{') && t.endsWith('}')) {
        const inner = t.slice(1, -1).trim();
        if (inner.length > 0) parts.push(inner);
      } else {
        parts.push(`...${t}`);
      }
    }

    if (parts.length === 0) {
      // Pure positional `error(msg, undefined, undefined)` → just `error(msg)`
      out += src.slice(i, match.index) + `${match[1]}.error(${msg})`;
      changed = true;
      i = closeIdx + 1;
      continue;
    }

    const objLiteral = `{ ${parts.join(', ')} }`;
    out += src.slice(i, match.index) + `${match[1]}.error(${msg}, ${objLiteral})`;
    changed = true;
    i = closeIdx + 1;
  }

  if (changed) writeFileSync(path, out);
  return changed;
}

let touched = 0;
for (const file of walk(ROOT)) {
  if (rewriteFile(file)) {
    touched++;
    // eslint-disable-next-line no-console
    console.log(`migrated: ${file}`);
  }
}
// eslint-disable-next-line no-console
console.log(`\ndone — rewrote ${touched} file(s)`);
