#!/usr/bin/env bun
/**
 * Companion to `lint-pii-in-logs.ts`. Forbids logging additional PII
 * fields outright — no `redactPhone` / `redactAddress` / `redactCpf`
 * helpers exist yet (V3 known gap). Until they do, the rule is:
 * don't log these fields. Use `userId` / `resumeId` to refer to the
 * subject instead.
 *
 * Banned field names (in logger metadata or template interpolations):
 *   phone, phoneNumber, mobile
 *   address, street, postalCode, zipCode
 *   fullName, firstName, lastName (use displayName when needed)
 *   cpf, taxId, ssn
 *   resumeContent, cvContent, resumeBody (free-text resume payloads
 *     usually carry addresses, schools, employers — treat as PII)
 *
 * Inline escape: `// lint-allow-pii-extended: <reason>`.
 *
 * Run: bun run scripts/lint-pii-extended.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dir, '..');
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
const BANNED = [
  'phone',
  'phoneNumber',
  'mobile',
  'address',
  'street',
  'postalCode',
  'zipCode',
  'fullName',
  'firstName',
  'lastName',
  'cpf',
  'taxId',
  'ssn',
  'resumeContent',
  'cvContent',
  'resumeBody',
];
const ALLOWLIST = new Set<string>(['scripts/lint-pii-extended.ts']);

const LOGGER_CALL = /\b(?:logger|this\.logger)\.(?:log|debug|info|warn|error)\s*\(/g;
const ESCAPE = /lint-allow-pii-extended:\s*\S/;
const fieldAlt = BANNED.join('|');
const FIELD_RE = new RegExp(`(?:^|[\\s,{])(${fieldAlt})\\s*:`, 'gi');
const INTERP_RE = new RegExp(`\\$\\{[^}]*\\b(${fieldAlt})\\b[^}]*\\}`, 'gi');

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
    if (stat.isDirectory()) yield* walk(full);
    else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts') && !entry.endsWith('.test.ts'))
      yield full;
  }
}

const offenders: Array<{ file: string; line: number; field: string }> = [];

for (const r of ROOTS) {
  for (const file of walk(join(ROOT, r))) {
    const rel = relative(ROOT, file);
    if (ALLOWLIST.has(rel)) continue;
    const src = readFileSync(file, 'utf8');
    const srcLines = src.split('\n');

    LOGGER_CALL.lastIndex = 0;
    let callMatch: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
    while ((callMatch = LOGGER_CALL.exec(src)) !== null) {
      const argsStart = callMatch.index + callMatch[0].length;
      let depth = 1;
      let j = argsStart;
      while (j < src.length && depth > 0) {
        const ch = src[j];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        j++;
      }
      const block = src.slice(argsStart, j - 1);

      FIELD_RE.lastIndex = 0;
      let fm: RegExpExecArray | null;
      // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
      while ((fm = FIELD_RE.exec(block)) !== null) {
        const absPos = argsStart + fm.index;
        const lineNum = src.slice(0, absPos).split('\n').length;
        if (ESCAPE.test(srcLines[lineNum - 1] || '')) continue;
        offenders.push({ file: rel, line: lineNum, field: fm[1] });
      }
      INTERP_RE.lastIndex = 0;
      let im: RegExpExecArray | null;
      // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
      while ((im = INTERP_RE.exec(block)) !== null) {
        const absPos = argsStart + im.index;
        const lineNum = src.slice(0, absPos).split('\n').length;
        if (ESCAPE.test(srcLines[lineNum - 1] || '')) continue;
        offenders.push({ file: rel, line: lineNum, field: im[1] });
      }
    }
  }
}

if (offenders.length === 0) {
  console.log('lint-pii-extended: 0 violations.');
  process.exit(0);
}
console.error(`lint-pii-extended: ${offenders.length} violation(s):`);
for (const o of offenders) console.error(`  ${o.file}:${o.line}  field=${o.field}`);
console.error(
  '\nThese fields are PII without a redaction helper today. Reference by userId/resumeId, ' +
    'or wait for redactPhone/redactAddress/etc. to land in shared-kernel/logger.',
);
process.exit(1);
