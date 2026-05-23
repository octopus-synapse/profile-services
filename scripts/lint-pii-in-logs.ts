#!/usr/bin/env bun
/**
 * P0-007/008 lint rule (error-default).
 *
 * Forbids logging raw email addresses outside an explicit allowlist.
 * Detects two patterns inside `logger.<level>(...)` calls:
 *
 *   1. String interpolation referencing `email`:
 *        logger.log(`... ${user.email} ...`)
 *
 *   2. Object metadata field with email-like name (`email`, `to`,
 *      `recipient`, `userEmail`, `emailAddress`) where the RHS is NOT
 *      wrapped in `redactEmail(...)`:
 *        logger.warn('msg', 'Ctx', { to: options.to });          // BAD
 *        logger.warn('msg', 'Ctx', { to: redactEmail(options.to) }); // OK
 *
 * The fix is to wrap with `redactEmail(...)` from `@/shared-kernel/logger`,
 * or to log a non-PII identifier (userId / id) instead.
 *
 * Mode controlled by `PII_LINT_MODE` env var:
 *   - "error" (default): exit 1 if any offender is found
 *   - "warn":  logs offenders, exit 0 (transition only)
 *
 * Scope: src/** AND scripts/** (production code + ops scripts).
 * Excludes: test/, *.spec.ts, *.test.ts, dist/, build/, the helper itself.
 *
 * Run:
 *   bun run scripts/lint-pii-in-logs.ts
 *   PII_LINT_MODE=warn bun run scripts/lint-pii-in-logs.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src', 'scripts'];
const SKIP_DIRS = new Set([
  'node_modules',
  'testing',
  '__mocks__',
  '__tests__',
  'test',
  'dist',
  'build',
]);

// Files allowed to log raw emails. Add only with reason in commit.
const ALLOWLIST = new Set<string>([
  // The redaction helper itself.
  'src/shared-kernel/logger/redact-email.ts',
  // Lint script contains the patterns it forbids.
  'scripts/lint-pii-in-logs.ts',
]);

const FIELD_NAMES = ['email', 'to', 'recipient', 'userEmail', 'emailAddress'];
const FIELD_NAME_ALT = FIELD_NAMES.join('|');

// Match `logger.<level>(` to identify the start of a log call.
const LOGGER_CALL = /\b(?:logger|this\.logger)\.(?:log|debug|info|warn|error)\s*\(/g;

// Inside a captured logger call body, find `field: <value>` where field
// is one of FIELD_NAMES, anchored by line-start, comma, or open-brace.
// Captures the value up to the next comma at the same nesting level (or
// closing brace). We then check in JS if the value starts with `redactEmail(`.
const FIELD_ASSIGN = new RegExp(String.raw`(?:^|[\s,{])(${FIELD_NAME_ALT})\s*:\s*([^,\n}]+)`, 'gi');

// Interpolation: `${...email...}` inside a template string.
// Uses iterative scan + per-interpolation predicate so wrapping in
// `redactEmail(...)` is correctly treated as safe.
const INTERP_FINDER = /\$\{([^}]+)\}/g;
const INTERP_REFERENCES_PII = /\b(?:email|recipient|userEmail|emailAddress)\b|\.to\b|\bto\s*[):,]/i;
function interpolationLeaksPII(inner: string): boolean {
  const trimmed = inner.trim();
  if (/^redactEmail\s*\(/.test(trimmed)) return false;
  return INTERP_REFERENCES_PII.test(inner);
}

interface Offender {
  file: string;
  line: number;
  text: string;
  reason: string;
}

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.') || SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      yield* walk(full);
    } else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.test.ts')
    ) {
      yield full;
    }
  }
}

function isRedactedValue(value: string): boolean {
  return /^\s*redactEmail\s*\(/.test(value.trim());
}

// Check whether a position lies inside a string literal. Naive but
// good enough for object-metadata detection: scans characters from
// blockStart, toggling string state on unescaped `'` `"` quotes.
// Backticks are handled separately (template strings) — interpolations
// `${...}` are checked by INTERP_EMAIL anyway.
function isInsideStringOrComment(block: string, pos: number): boolean {
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < pos; i++) {
    const ch = block[i];
    const prev = i > 0 ? block[i - 1] : '';
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '/' && prev === '*') inBlockComment = false;
      continue;
    }
    if (inSingle) {
      if (ch === "'" && prev !== '\\') inSingle = false;
      continue;
    }
    if (inDouble) {
      if (ch === '"' && prev !== '\\') inDouble = false;
      continue;
    }
    if (inBacktick) {
      if (ch === '`' && prev !== '\\') inBacktick = false;
      continue;
    }
    if (ch === '/' && block[i + 1] === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && block[i + 1] === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === "'") inSingle = true;
    else if (ch === '"') inDouble = true;
    else if (ch === '`') inBacktick = true;
  }
  return inSingle || inDouble || inBacktick || inLineComment || inBlockComment;
}

const offenders: Offender[] = [];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (ALLOWLIST.has(file)) continue;
    const src = readFileSync(file, 'utf8');

    LOGGER_CALL.lastIndex = 0;
    let callMatch: RegExpExecArray | null;
    while ((callMatch = LOGGER_CALL.exec(src)) !== null) {
      const argsStart = callMatch.index + callMatch[0].length;
      // Balance parens to find argsEnd.
      let depth = 1;
      let j = argsStart;
      while (j < src.length && depth > 0) {
        const ch = src[j];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        j++;
      }
      const block = src.slice(argsStart, j - 1);

      // Pattern 1: interpolated email/to/recipient (skip if wrapped in redactEmail()).
      INTERP_FINDER.lastIndex = 0;
      let interpMatch: RegExpExecArray | null;
      while ((interpMatch = INTERP_FINDER.exec(block)) !== null) {
        const inner = interpMatch[1];
        if (!interpolationLeaksPII(inner)) continue;
        const matchAbsPos = argsStart + interpMatch.index;
        // Skip if inside a non-template string (single/double-quoted) or comment.
        if (isInsideStringOrComment(block, interpMatch.index)) continue;
        const lineNum = src.slice(0, matchAbsPos).split('\n').length;
        const lineText = src.split('\n')[lineNum - 1] ?? '';
        offenders.push({
          file,
          line: lineNum,
          text: lineText.trim(),
          reason: `interpolated PII reference \${${inner.trim()}}`,
        });
      }

      // Pattern 2: field: value where value is not redactEmail(...).
      FIELD_ASSIGN.lastIndex = 0;
      let fieldMatch: RegExpExecArray | null;
      while ((fieldMatch = FIELD_ASSIGN.exec(block)) !== null) {
        const fieldName = fieldMatch[1];
        const value = fieldMatch[2];
        const matchAbsPos = argsStart + fieldMatch.index;
        // Skip if inside a string literal (e.g. `to: ` in a path string).
        if (isInsideStringOrComment(block, fieldMatch.index)) continue;
        if (isRedactedValue(value)) continue;
        const lineNum = src.slice(0, matchAbsPos).split('\n').length;
        const lineText = src.split('\n')[lineNum - 1] ?? '';
        offenders.push({
          file,
          line: lineNum,
          text: lineText.trim(),
          reason: `field "${fieldName}" RHS not wrapped in redactEmail()`,
        });
      }
    }
  }
}

const mode = process.env.PII_LINT_MODE === 'warn' ? 'warn' : 'error';

if (offenders.length === 0) {
  // eslint-disable-next-line no-console
  console.log('lint-pii-in-logs: 0 violations.');
  process.exit(0);
}

// eslint-disable-next-line no-console
console.log(`lint-pii-in-logs (${mode}): ${offenders.length} email-leaking log call(s):\n`);
for (const o of offenders) {
  // eslint-disable-next-line no-console
  console.log(`  ${o.file}:${o.line}  [${o.reason}]\n    ${o.text}`);
}

if (mode === 'error') {
  // eslint-disable-next-line no-console
  console.log(
    '\nFix: import { redactEmail } from "@/shared-kernel/logger" and wrap the value, or log a non-PII id.',
  );
  process.exit(1);
}
process.exit(0);
