#!/usr/bin/env bun
/**
 * Cat 2 #9 / Cat 5 #9: "boolean trap" — a function whose signature
 * has 3+ parameters and 2+ booleans loses readability at the call
 * site. `foo(true, false, true)` is mystery meat. Convention: use a
 * named-options object instead.
 *
 *   // bad
 *   compileTemplate(html, true, false, true)
 *
 *   // good
 *   compileTemplate(html, { minify: true, sourcemap: false, inline: true })
 *
 * Detection: scan function / method / arrow declarations with 3+
 * parameters where 2+ are explicitly typed `boolean` (or have a
 * boolean default). Spec files are exempt — tests over-parameterise
 * helpers and the call-site readability concern is reversed.
 *
 * Baseline-ratchet because some existing helpers may legitimately
 * accept multiple booleans (rare).
 *
 * Inline escape `// lint-allow-boolean-trap: <reason>` on the function
 * signature line.
 *
 * Run: bun run scripts/lint-boolean-trap.ts
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');
const BASELINE_PATH = resolve(ROOT, 'scripts/lint-boolean-trap.baseline.txt');
const ESCAPE_RE = /lint-allow-boolean-trap:\s*\S/;

// Match `function name(` / `methodName(` / `name = (` / `name: (` / `(` (arrow IIFE)
// with the param list. Capturing only the (..) span — we'll analyse the contents.
// The regex stays conservative: it requires the open-paren and uses a non-greedy
// balanced-ish scan via bracket depth manually below.
const SIG_RE =
  /\b(?:function\s+\w+|(?:public|private|protected|static|async|readonly|\s)*\w+)\s*\(/g;

function extractParenBody(src: string, openIdx: number): { body: string; closeIdx: number } | null {
  let depth = 1;
  let i = openIdx + 1;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === '"' || ch === "'" || ch === '`') {
      // skip string
      const quote = ch;
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\') i++;
        i++;
      }
    }
    i++;
  }
  if (depth !== 0) return null;
  return { body: src.slice(openIdx + 1, i - 1), closeIdx: i - 1 };
}

function splitParams(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') depth++;
    else if (ch === ')' || ch === ']' || ch === '}' || ch === '>') depth--;
    else if (ch === ',' && depth === 0) {
      out.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (start < body.length) out.push(body.slice(start).trim());
  return out.filter((p) => p.length > 0);
}

function isBooleanParam(param: string): boolean {
  // explicit `: boolean` or default of `true`/`false`.
  if (/:\s*boolean\b/.test(param)) return true;
  if (/=\s*(?:true|false)\b/.test(param)) return true;
  return false;
}

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'node_modules' || entry === 'generated') continue;
    const full = join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) yield* walk(full);
    else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.d.ts')
    )
      yield full;
  }
}

type Site = { file: string; line: number; bools: number; total: number; escaped: boolean };
const sites: Site[] = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  SIG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
  while ((m = SIG_RE.exec(src)) !== null) {
    const openIdx = m.index + m[0].length - 1;
    const paren = extractParenBody(src, openIdx);
    if (!paren) continue;
    const params = splitParams(paren.body);
    if (params.length < 3) continue;
    const bools = params.filter(isBooleanParam).length;
    if (bools < 2) continue;
    const lineNum = src.slice(0, m.index).split('\n').length;
    const escaped = ESCAPE_RE.test(lines[lineNum - 1] || '');
    sites.push({ file: rel, line: lineNum, bools, total: params.length, escaped });
    // Avoid re-scanning the same paren body
    SIG_RE.lastIndex = paren.closeIdx;
  }
}

const total = sites.length;

if (process.env.UPDATE_BASELINE === '1') {
  writeFileSync(BASELINE_PATH, `${total}\n`);
  console.log(`[boolean-trap] baseline updated to ${total}`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH) ? Number(readFileSync(BASELINE_PATH, 'utf8').trim()) : 0;

if (total > baseline) {
  const fresh = sites.filter((s) => !s.escaped);
  console.error(
    `lint-boolean-trap: regression — ${total - baseline} new occurrence(s). ` +
      `Total ${total} (baseline ${baseline}).`,
  );
  console.error(
    '\nReplace multi-boolean params with a named options object: ' +
      'foo(x, { flagA, flagB, flagC }).\n',
  );
  for (const s of fresh.slice(-20))
    console.error(`  ${s.file}:${s.line}  (${s.bools} of ${s.total} params boolean)`);
  process.exit(1);
}
console.log(`lint-boolean-trap: ${total} occurrence(s) (baseline ${baseline}), within budget`);
