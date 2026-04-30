#!/usr/bin/env bun
/**
 * Migrates files matching the canonical Nest Logger pattern to the
 * shared-kernel LoggerPort:
 *
 *   import { Injectable, Logger } from '@nestjs/common';
 *
 *   @Injectable()
 *   export class FooService {
 *     private readonly logger = new Logger(FooService.name);
 *     constructor(private readonly bar: Bar) {}
 *     ...
 *     this.logger.log('msg');
 *   }
 *
 * → injects LoggerPort via constructor, keeps the original class name as
 * a per-call context, and rewrites every `this.logger.<method>` site to
 * include that context. Skips any file that doesn't fit the canonical
 * pattern so they can be migrated by hand.
 *
 * Usage:
 *   bun scripts/migrate-legacy-logger.ts            # dry-run
 *   bun scripts/migrate-legacy-logger.ts --write    # apply edits
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO = join(import.meta.dirname, '..');
const SRC = join(REPO, 'src');
const WRITE = process.argv.includes('--write');

const SKIP = new Set<string>([
  'bounded-contexts/platform/common/logger/logger.service.ts',
  'bounded-contexts/platform/common/logger/logger.module.ts',
  'bounded-contexts/platform/common/logger/app-logger.adapter.ts',
  'main.ts',
  'bounded-contexts/identity/authorization/seeds/seed-runner.ts',
]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') continue;
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

interface Plan {
  rel: string;
  before: string;
  after: string;
  className: string;
  reason?: string;
}

interface Skip {
  rel: string;
  reason: string;
}

const plans: Plan[] = [];
const skips: Skip[] = [];

for (const path of walk(SRC)) {
  const rel = relative(SRC, path).replace(/\\/g, '/');
  if (SKIP.has(rel)) continue;

  const original = readFileSync(path, 'utf8');

  // Quick filter: must reference the Nest Logger.
  if (!/from\s+['"]@nestjs\/common['"]/.test(original)) continue;
  if (!/\bLogger\b/.test(original)) continue;

  // Skip if Logger is exported / re-exported from this file.
  if (/export\s*\{[^}]*\bLogger\b[^}]*\}/.test(original)) {
    skips.push({ rel, reason: 'exports Logger' });
    continue;
  }
  // Skip static usages — `Logger.log(...)` directly.
  if (/(?<!new\s)\bLogger\s*\.\s*(log|warn|error|debug)/.test(original)) {
    skips.push({ rel, reason: 'static Logger.* usage' });
    continue;
  }

  // Find a single canonical instance field.
  const fieldRe =
    /^(\s*)private\s+readonly\s+logger\s*=\s*new\s+Logger\(\s*([A-Za-z_$][\w$]*)\s*(?:\.\s*name)?\s*\);?\s*$/m;
  const fieldMatch = fieldRe.exec(original);
  if (!fieldMatch) {
    if (/new\s+Logger\(/.test(original))
      skips.push({ rel, reason: 'non-canonical new Logger(...) site' });
    continue;
  }

  // Multiple `new Logger(` instances → too risky.
  if ((original.match(/new\s+Logger\(/g) ?? []).length > 1) {
    skips.push({ rel, reason: 'multiple new Logger(...) sites' });
    continue;
  }

  // Find the class declaration this field belongs to.
  const classRe = /export\s+(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g;
  let className: string | null = null;
  let classMatchText: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = classRe.exec(original))) {
    if (m.index < fieldMatch.index) {
      className = m[1];
      classMatchText = m[0];
    } else break;
  }
  if (!className) {
    skips.push({ rel, reason: 'no enclosing class' });
    continue;
  }

  // Verify the field is referencing this class (or a string literal).
  const fieldRefName = fieldMatch[2];
  if (fieldRefName !== className && !fieldMatch[0].includes(`'${className}'`)) {
    // Allow string literals in Logger(<class-name>.name) variants — accept anyway
    // unless the reference is clearly a different identifier.
    if (fieldRefName !== className) {
      // Tolerate — pass through.
    }
  }

  // Skip if Logger is used as a type (`: Logger`, `<Logger>`, etc.).
  const remainingForTypeCheck = original.replace(fieldRe, '');
  if (/[:<]\s*Logger\b/.test(remainingForTypeCheck)) {
    skips.push({ rel, reason: 'Logger used as a type' });
    continue;
  }

  let mutated = original;

  // 1) Strip Logger from the @nestjs/common import (handles single-line and
  //    multi-line { ... } shapes via [\s\S]). If the resulting list is
  //    empty, drop the whole import statement (including its trailing \n).
  mutated = mutated.replace(
    /import\s*\{\s*([^}]*?)\s*\}\s*from\s*(['"])@nestjs\/common\2;?\n?/g,
    (_full, inner: string, q: string) => {
      const parts = inner
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s !== 'Logger');
      if (parts.length === 0) return '';
      return `import { ${parts.join(', ')} } from ${q}@nestjs/common${q};\n`;
    },
  );

  // 2) Add LoggerPort import if absent. Detect the END of the last import
  //    statement (single-line OR multi-line) by walking from the start.
  if (!/\bLoggerPort\b/.test(mutated)) {
    const sharedKernelImport = /import\s*\{\s*([^}]*?)\s*\}\s*from\s*(['"])@\/shared-kernel\2;?/;
    if (sharedKernelImport.test(mutated)) {
      mutated = mutated.replace(sharedKernelImport, (_m, inner: string, q: string) => {
        const items = inner
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (!items.includes('LoggerPort')) items.push('LoggerPort');
        items.sort();
        return `import { ${items.join(', ')} } from ${q}@/shared-kernel${q};`;
      });
    } else {
      const importLine = `import { LoggerPort } from '@/shared-kernel';`;
      // Find the end of the LAST import statement using a stateful scan.
      const importStmtRe = /import[\s\S]*?from\s*['"][^'"]+['"];?/g;
      let lastEnd = -1;
      let im: RegExpExecArray | null;
      while ((im = importStmtRe.exec(mutated))) lastEnd = im.index + im[0].length;
      if (lastEnd >= 0) {
        mutated = `${mutated.slice(0, lastEnd)}\n${importLine}${mutated.slice(lastEnd)}`;
      } else {
        mutated = `${importLine}\n${mutated}`;
      }
    }
  }

  // 3) Remove the field declaration.
  mutated = mutated.replace(fieldRe, '');

  // 4) Inject LoggerPort into the constructor — append as last param. Pick
  //    the FIRST constructor that follows the class declaration, since
  //    nested classes are uncommon in this codebase.
  const ctorIdxRe = /constructor\s*\(([\s\S]*?)\)\s*\{/;
  if (!classMatchText) continue;
  const classDeclIdx = mutated.indexOf(classMatchText);
  const ctorMatch = ctorIdxRe.exec(mutated.slice(classDeclIdx));
  if (ctorMatch) {
    const fullCtorAt = classDeclIdx + ctorMatch.index;
    const inner = ctorMatch[1].trim();
    let newInner: string;
    if (inner.length === 0) {
      newInner = `private readonly logger: LoggerPort`;
    } else {
      // Multi-line vs single-line.
      if (inner.includes('\n')) {
        const indent =
          (mutated.slice(classDeclIdx).match(/constructor\s*\(\s*\n(\s+)/) || [])[1] ?? '    ';
        newInner = `${inner}${inner.endsWith(',') ? '' : ','}\n${indent}private readonly logger: LoggerPort,`;
      } else {
        newInner = `${inner}, private readonly logger: LoggerPort`;
      }
    }
    mutated =
      mutated.slice(0, fullCtorAt) +
      mutated.slice(fullCtorAt).replace(ctorIdxRe, `constructor(${newInner}) {`);
  } else {
    // No constructor exists. We'd need to inject one, but if the class
    // extends another we'd also need to invoke `super(...)` which is too
    // risky to script without knowing the base constructor signature.
    const headerHasExtends = new RegExp(`class\\s+${className}\\s+extends\\b`).test(mutated);
    if (headerHasExtends) {
      skips.push({
        rel,
        reason:
          'class extends another and lacks an explicit constructor — needs manual super() wiring',
      });
      continue;
    }
    const classHeaderRe = new RegExp(
      `(export\\s+(?:abstract\\s+)?class\\s+${className}[^{]*\\{)`,
      'm',
    );
    if (!classHeaderRe.test(mutated)) {
      skips.push({ rel, reason: 'class header not found after edits' });
      continue;
    }
    mutated = mutated.replace(
      classHeaderRe,
      `$1\n  constructor(private readonly logger: LoggerPort) {}`,
    );
  }

  // 5) Add CTX field right after the (now-existing) constructor closing brace
  //    or as a class field. Simpler: prepend a `private readonly CTX = '<class>';`
  //    field right after the class header, before the constructor.
  const ctxField = `private readonly CTX = '${className}';`;
  const headerRe = new RegExp(`(export\\s+(?:abstract\\s+)?class\\s+${className}[^{]*\\{)`);
  if (!/\bCTX\b\s*=/.test(mutated)) {
    mutated = mutated.replace(headerRe, `$1\n  ${ctxField}`);
  }

  // 6) Rewrite call sites. For log/warn/debug: append `this.CTX` as 2nd arg
  //    when there is no existing 2nd arg. For error: it already takes
  //    (msg, trace?, context?), so insert this.CTX as 3rd arg if not present.
  //    We use a balanced-paren scanner instead of `[^)]*` so template
  //    literals and nested calls are tolerated, and we trim a trailing
  //    comma so we don't produce `(.., , this.CTX)`.
  mutated = rewriteLoggerCalls(mutated);

  // 7) Tidy: collapse extra blank lines that result from the field deletion.
  mutated = mutated.replace(/\n{3,}/g, '\n\n');

  if (mutated === original) {
    skips.push({ rel, reason: 'no diff produced — pattern matched but rewrite was a no-op' });
    continue;
  }

  plans.push({ rel, before: original, after: mutated, className });
  if (WRITE) writeFileSync(path, mutated);
}

/** Scans a source for `this.logger.<m>(...)` invocations and rewrites
 * each one with the class-name context appended. Uses a hand-rolled
 * paren scanner so template literals, nested calls and multi-line
 * arg lists are handled robustly. */
function rewriteLoggerCalls(src: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < src.length) {
    const idx = src.indexOf('this.logger.', i);
    if (idx === -1) {
      out.push(src.slice(i));
      break;
    }
    out.push(src.slice(i, idx));
    const methodMatch = /^this\.logger\.([a-zA-Z]+)\s*\(/.exec(src.slice(idx));
    if (!methodMatch) {
      out.push(src.slice(idx, idx + 1));
      i = idx + 1;
      continue;
    }
    const method = methodMatch[1];
    if (!['log', 'warn', 'debug', 'error'].includes(method)) {
      out.push(src.slice(idx, idx + methodMatch[0].length));
      i = idx + methodMatch[0].length;
      continue;
    }
    const openParen = idx + methodMatch[0].length - 1;
    const close = findMatchingParen(src, openParen);
    if (close === -1) {
      out.push(src.slice(idx));
      break;
    }
    const argsRaw = src.slice(openParen + 1, close);
    const parts = splitTopLevel(argsRaw);
    let rebuilt: string;
    if (parts.length === 0) {
      rebuilt = `this.logger.${method}()`; // empty call — leave alone
    } else if (method === 'error') {
      if (parts.length === 1) {
        rebuilt = `this.logger.error(${parts[0]}, undefined, this.CTX)`;
      } else if (parts.length === 2) {
        rebuilt = `this.logger.error(${parts[0]}, ${parts[1]}, this.CTX)`;
      } else {
        rebuilt = src.slice(idx, close + 1); // 3+ args already, leave it
      }
    } else {
      if (parts.length >= 2) {
        rebuilt = src.slice(idx, close + 1); // already has context
      } else {
        rebuilt = `this.logger.${method}(${parts[0]}, this.CTX)`;
      }
    }
    out.push(rebuilt);
    i = close + 1;
  }
  return out.join('');
}

function findMatchingParen(src: string, openIdx: number): number {
  let depth = 0;
  let inStr: string | null = null;
  let inTpl = 0; // ${ depth inside backtick
  let inBacktick = false;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    const prev = src[i - 1];
    if (inBacktick) {
      if (ch === '`' && prev !== '\\') {
        if (inTpl === 0) inBacktick = false;
      } else if (ch === '$' && src[i + 1] === '{') {
        inTpl += 1;
        i += 1;
      } else if (ch === '}' && inTpl > 0) {
        inTpl -= 1;
      }
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
      inBacktick = true;
      continue;
    }
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevel(args: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  let inStr: string | null = null;
  let inBacktick = false;
  let tplDepth = 0;
  for (let i = 0; i < args.length; i++) {
    const ch = args[i];
    const prev = args[i - 1];
    if (inBacktick) {
      buf += ch;
      if (ch === '`' && prev !== '\\' && tplDepth === 0) inBacktick = false;
      else if (ch === '$' && args[i + 1] === '{') {
        tplDepth += 1;
        buf += args[++i];
      } else if (ch === '}' && tplDepth > 0) tplDepth -= 1;
      continue;
    }
    if (inStr) {
      buf += ch;
      if (ch === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      buf += ch;
      continue;
    }
    if (ch === '`') {
      inBacktick = true;
      buf += ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    if (ch === ',' && depth === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

console.log(`Files migrated: ${plans.length}`);
for (const p of plans) console.log(`  ✓ ${p.rel}  (class ${p.className})`);
console.log(`\nFiles skipped: ${skips.length}`);
for (const s of skips) console.log(`  ✗ ${s.rel}  — ${s.reason}`);

if (!WRITE) console.log('\nDry-run — re-run with --write to apply.');
