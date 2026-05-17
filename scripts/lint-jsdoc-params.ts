#!/usr/bin/env bun
/**
 * Cat 5 #10: JSDoc `@param <name>` tags must match the actual parameter
 * names of the function that follows. When a param is renamed but the
 * JSDoc isn't, the docs lie and editor tooltips lie. This lint catches
 * that drift mechanically.
 *
 * Algorithm: for each JSDoc block (`/** ... *\/`) that contains one or
 * more `@param`, find the next function/method/arrow declaration in
 * the same file, extract its declared parameter names, and verify
 * each `@param <name>` corresponds to one. Extra `@param` tags
 * (documenting non-existent params) fail. Missing `@param` for an
 * existing param does NOT fail — partial documentation is fine; lying
 * documentation is not.
 *
 * Destructured / rest params: `{ a, b }: Opts` and `...rest` are
 * tolerated as a single param named by the type alias or `rest`.
 * `@param {Opts} options` style is also accepted (matches by type
 * heuristic).
 *
 * Inline escape `// lint-allow-jsdoc-mismatch: <reason>` on the JSDoc
 * opening line.
 *
 * Run: bun run scripts/lint-jsdoc-params.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');

const JSDOC_RE = /\/\*\*[\s\S]*?\*\//g;
const PARAM_TAG_RE = /@param(?:\s+\{[^}]*\})?\s+([a-zA-Z_$][\w$]*)/g;
// Signature heads we expect immediately after a JSDoc. The trailing
// `(?:\s*<[^>]*>)?\s*\(` accepts an optional generic-parameter list
// between the function/method name and the open paren — without it
// the regex would skip a generic-typed function and latch onto a
// `someCall(` in the body instead.
const SIG_HEADS = [
  /\bfunction\s+\w+(?:\s*<[^>]*>)?\s*\(/, // function foo<T>(
  /\bconst\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>/, // const foo = (...) =>
  /\b(?:public|private|protected|static|async|readonly)\s+(?:\w+\s+)?\w+(?:\s*<[^>]*>)?\s*\(/, // public foo<T>(
  /^\s*\w+(?:\s*<[^>]*>)?\s*\(/m, // foo<T>( at line start (method shorthand)
];
const ESCAPE_RE = /lint-allow-jsdoc-mismatch:\s*\S/;

function extractParenBody(src: string, openIdx: number): string | null {
  let depth = 1;
  let i = openIdx + 1;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') i++;
        i++;
      }
    }
    i++;
  }
  if (depth !== 0) return null;
  return src.slice(openIdx + 1, i - 1);
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

function extractParamName(param: string): string | null {
  // Strip any chain of access-/mutability-modifiers, not just one (e.g.
  // `private readonly key: Buffer`). The previous single-pass replace
  // left `readonly key` as the param body, which then matched the wrong
  // identifier and produced spurious "@param key not in [readonly]"
  // failures.
  const MODIFIER_RE = /^(?:public|private|protected|readonly)\s+/;
  let stripped = param.trim();
  while (MODIFIER_RE.test(stripped)) {
    stripped = stripped.replace(MODIFIER_RE, '').trim();
  }
  if (stripped.startsWith('{')) {
    // Destructured: match the type alias `: TypeName` after the closing brace, else "options".
    const after = stripped.match(/\}\s*:\s*([A-Za-z_$][\w$]*)/);
    return after ? after[1].toLowerCase() : 'options';
  }
  if (stripped.startsWith('[')) return 'array';
  if (stripped.startsWith('...')) {
    const rest = stripped.match(/^\.\.\.\s*([a-zA-Z_$][\w$]*)/);
    return rest ? rest[1] : 'rest';
  }
  const named = stripped.match(/^([a-zA-Z_$][\w$]*)/);
  return named ? named[1] : null;
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

type Offense = { file: string; line: number; jsdocParam: string; sigParams: string[] };
const offenses: Offense[] = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  JSDOC_RE.lastIndex = 0;
  let block: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
  while ((block = JSDOC_RE.exec(src)) !== null) {
    const text = block[0];
    PARAM_TAG_RE.lastIndex = 0;
    const tagNames: string[] = [];
    let pm: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
    while ((pm = PARAM_TAG_RE.exec(text)) !== null) tagNames.push(pm[1]);
    if (tagNames.length === 0) continue;

    // Look at the block's opening line for escape.
    const openLine = src.slice(0, block.index).split('\n').length;
    const lines = src.split('\n');
    if (ESCAPE_RE.test(lines[openLine - 1] || '')) continue;

    // Find the next signature after this block. Try each head pattern
    // and pick the earliest match — that's the function the JSDoc
    // attaches to.
    const after = src.slice(block.index + text.length);
    let bestIdx = -1;
    let bestLen = 0;
    for (const head of SIG_HEADS) {
      const m2 = after.match(head);
      if (!m2 || m2.index === undefined) continue;
      if (bestIdx === -1 || m2.index < bestIdx) {
        bestIdx = m2.index;
        bestLen = m2[0].length;
      }
    }
    if (bestIdx === -1) continue;
    // Skip arrow-form signatures (no traditional `(args)` body to extract).
    const headSlice = after.slice(bestIdx, bestIdx + bestLen);
    if (headSlice.endsWith('=>')) continue;
    const sigStart = bestIdx + bestLen - 1;
    const paren = extractParenBody(after, sigStart);
    if (paren === null) continue;
    const sigParams = splitParams(paren)
      .map(extractParamName)
      .filter((n): n is string => n !== null);
    const sigSet = new Set(sigParams.map((n) => n.toLowerCase()));

    for (const tag of tagNames) {
      if (!sigSet.has(tag.toLowerCase())) {
        offenses.push({ file: rel, line: openLine, jsdocParam: tag, sigParams });
      }
    }
  }
}

if (offenses.length === 0) {
  console.log('lint-jsdoc-params: 0 violations');
  process.exit(0);
}
console.error(`lint-jsdoc-params: ${offenses.length} violation(s):`);
for (const o of offenses.slice(0, 30)) {
  console.error(`  ${o.file}:${o.line}  @param ${o.jsdocParam} not in [${o.sigParams.join(', ')}]`);
}
if (offenses.length > 30) console.error(`  …and ${offenses.length - 30} more`);
console.error('\nUpdate the JSDoc to match the current signature, or remove the stale @param tag.');
process.exit(1);
