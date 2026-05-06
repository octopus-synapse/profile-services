#!/usr/bin/env bun
/**
 * i18n audit — phase 1 discovery.
 *
 * Scans the backend source tree and produces four inventory files under
 * `docs/i18n/`. It does NOT change runtime behaviour. The output is the
 * backlog that phase 2 (classify) and phase 3 (catalog) consume.
 *
 * Buckets:
 *   - errors        — every DomainException subclass + every `throw new *Exception(...)`
 *                     call site. Classifies by whether the exception carries a
 *                     concrete code ("classified") or reuses a generic one
 *                     ("ambiguous"), plus throws of bare Error / HttpException
 *                     ("unstable").
 *   - validation    — every Zod schema + refinement; lists the ZodIssueCode
 *                     shapes we'll need to map to stable codes in phase 2.
 *   - enums         — every Prisma enum exposed via a DTO response.
 *   - notifications — every NotificationType value + the params found in its
 *                     data payload (best-effort static grep).
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const REPO_ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(REPO_ROOT, 'src');
const PRISMA = join(REPO_ROOT, 'prisma/schema');
const OUT = join(REPO_ROOT, 'docs/i18n');

type FileRef = { file: string; line: number };

type ClassifiedError = {
  className: string;
  code: string;
  file: string;
  extends?: string;
};

type AmbiguousThrow = FileRef & {
  className: string; // Exception class being reused
  sharedCode: string;
  message: string; // literal message arg if present
};

type UnstableThrow = FileRef & {
  kind: 'Error' | 'HttpException';
  message: string;
};

type ErrorsInventory = {
  summary: {
    classifiedCount: number;
    ambiguousCount: number;
    unstableCount: number;
    distinctCodes: number;
  };
  classified: ClassifiedError[];
  ambiguous: AmbiguousThrow[];
  unstable: UnstableThrow[];
};

type ValidationInventory = {
  summary: { schemas: number; refinements: number };
  zodIssueShapes: string[]; // draft issue-code mapping proposals
  refinements: Array<FileRef & { snippet: string }>;
};

type EnumsInventory = {
  summary: { enumCount: number; valueCount: number };
  enums: Record<string, { values: string[]; exposedIn: string[] }>;
};

type NotificationsInventory = {
  summary: { typeCount: number };
  types: Record<string, { paramsFound: string[]; sources: FileRef[] }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function walk(dir: string, acc: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    // Skip testing doubles and mocks — they intentionally throw bare Errors
    // and never reach the HTTP boundary.
    if (entry.name === 'testing' || entry.name === '__mocks__') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, acc);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function rel(file: string): string {
  return relative(REPO_ROOT, file);
}

function lineOf(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (source.charCodeAt(i) === 10) line++;
  return line;
}

// ---------------------------------------------------------------------------
// Errors discovery
// ---------------------------------------------------------------------------

const CLASS_DECL_RE = /export\s+(?:abstract\s+)?class\s+(\w+Exception)\s+extends\s+(\w+)/g;
const THROW_EXCEPTION_RE = /throw\s+new\s+(\w+Exception)\s*\(([^)]*)\)/g;
const THROW_BARE_RE = /throw\s+new\s+(Error|HttpException)\s*\(([^)]*)\)/g;
const CODE_FIELD_RE =
  /(?:readonly\s+|public\s+readonly\s+)code\s*(?::\s*string)?\s*=\s*['"]([A-Z_0-9]+)['"]/;

// Extract a balanced class body starting at the opening '{' after class name.
function extractClassBody(source: string, fromIndex: number): string {
  const openIdx = source.indexOf('{', fromIndex);
  if (openIdx < 0) return '';
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(openIdx, i + 1);
    }
  }
  return source.slice(openIdx);
}

async function inventoryErrors(files: string[]): Promise<ErrorsInventory> {
  const classified: ClassifiedError[] = [];
  const byClassName = new Map<string, ClassifiedError>();
  const ambiguous: AmbiguousThrow[] = [];
  const unstable: UnstableThrow[] = [];

  // Pass 1: class declarations that extend *Exception / DomainException.
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (!source.includes('Exception')) continue;
    if (file.endsWith('.spec.ts') || file.endsWith('.test.ts')) continue;
    let match: RegExpExecArray | null;
    CLASS_DECL_RE.lastIndex = 0;
    while (true) {
      match = CLASS_DECL_RE.exec(source);
      if (!match) break;
      const [, className, extendsName] = match;
      const body = extractClassBody(source, match.index);
      const codeMatch = body.match(CODE_FIELD_RE);
      const entry: ClassifiedError = {
        className,
        code: codeMatch?.[1] ?? '(no literal)',
        file: rel(file),
        extends: extendsName,
      };
      classified.push(entry);
      byClassName.set(className, entry);
    }
  }

  // Pass 2: every `throw new SomeException(...)` call site. Ambiguous when
  // the exception's `code` is one of the generic catch-all codes (multiple
  // throws share the same code → no single translatable message).
  const genericCodes = new Set([
    'CONFLICT',
    'BUSINESS_RULE_VIOLATION',
    'VALIDATION_ERROR',
    'ENTITY_NOT_FOUND',
    'FORBIDDEN',
    'UNAUTHORIZED',
    'LIMIT_EXCEEDED',
  ]);
  for (const file of files) {
    if (file.endsWith('.spec.ts') || file.endsWith('.test.ts')) continue;
    const source = await readFile(file, 'utf8');
    if (!source.includes('throw new')) continue;

    THROW_EXCEPTION_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while (true) {
      match = THROW_EXCEPTION_RE.exec(source);
      if (!match) break;
      const [, className, argsRaw] = match;
      const entry = byClassName.get(className);
      if (!entry) continue;
      if (!genericCodes.has(entry.code)) continue;
      const message = (argsRaw.match(/['"]([^'"]+)['"]/)?.[1] ?? '').trim();
      ambiguous.push({
        className,
        sharedCode: entry.code,
        message,
        file: rel(file),
        line: lineOf(source, match.index),
      });
    }

    THROW_BARE_RE.lastIndex = 0;
    while (true) {
      match = THROW_BARE_RE.exec(source);
      if (!match) break;
      const [, kind, argsRaw] = match;
      const message = (argsRaw.match(/['"]([^'"]+)['"]/)?.[1] ?? '').trim();
      unstable.push({
        kind: kind as 'Error' | 'HttpException',
        message,
        file: rel(file),
        line: lineOf(source, match.index),
      });
    }
  }

  const distinctCodes = new Set(classified.map((c) => c.code).filter((c) => c !== '(no literal)'));
  return {
    summary: {
      classifiedCount: classified.length,
      ambiguousCount: ambiguous.length,
      unstableCount: unstable.length,
      distinctCodes: distinctCodes.size,
    },
    classified: classified.sort((a, b) => a.className.localeCompare(b.className)),
    ambiguous: ambiguous.sort((a, b) => a.file.localeCompare(b.file)),
    unstable: unstable.sort((a, b) => a.file.localeCompare(b.file)),
  };
}

// ---------------------------------------------------------------------------
// Validation discovery (draft)
// ---------------------------------------------------------------------------

const ZOD_ISSUE_SHAPES = [
  'too_small(type=string,min=1) → REQUIRED',
  'too_small(type=string,min>1) → STRING_TOO_SHORT',
  'too_big(type=string) → STRING_TOO_LONG',
  'too_small(type=number) → NUMBER_TOO_SMALL',
  'too_big(type=number) → NUMBER_TOO_LARGE',
  'too_small(type=array,min=1) → ARRAY_REQUIRED',
  'too_small(type=array,min>1) → ARRAY_TOO_SHORT',
  'invalid_type(expected=string) → MUST_BE_STRING',
  'invalid_type(expected=number) → MUST_BE_NUMBER',
  'invalid_type(expected=boolean) → MUST_BE_BOOLEAN',
  'invalid_string(validation=email) → EMAIL_INVALID',
  'invalid_string(validation=url) → URL_INVALID',
  'invalid_string(validation=uuid) → UUID_INVALID',
  'invalid_string(validation=cuid) → CUID_INVALID',
  'invalid_string(validation=datetime) → DATETIME_INVALID',
  'invalid_string(validation=regex) → REGEX_MISMATCH',
  'invalid_enum_value → INVALID_ENUM_VALUE',
  'unrecognized_keys → UNRECOGNIZED_KEYS',
  'custom → require explicit code via { params: { code: "..." } }',
];

const REFINEMENT_RE = /\.(refine|superRefine)\s*\(/g;

async function inventoryValidation(files: string[]): Promise<ValidationInventory> {
  let schemas = 0;
  const refinements: Array<FileRef & { snippet: string }> = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (!source.includes('zod')) continue;
    if (/createZodDto|z\.object\s*\(/.test(source)) {
      schemas += (source.match(/z\.object\s*\(/g) ?? []).length;
    }
    REFINEMENT_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while (true) {
      match = REFINEMENT_RE.exec(source);
      if (!match) break;
      const start = Math.max(0, match.index - 40);
      const end = Math.min(source.length, match.index + 120);
      refinements.push({
        file: rel(file),
        line: lineOf(source, match.index),
        snippet: source.slice(start, end).replace(/\s+/g, ' ').trim(),
      });
    }
  }
  return {
    summary: { schemas, refinements: refinements.length },
    zodIssueShapes: ZOD_ISSUE_SHAPES,
    refinements,
  };
}

// ---------------------------------------------------------------------------
// Enums discovery (from Prisma schema files)
// ---------------------------------------------------------------------------

const PRISMA_ENUM_RE = /enum\s+(\w+)\s*\{([^}]+)\}/g;

async function inventoryEnums(tsFiles: string[]): Promise<EnumsInventory> {
  const enums: Record<string, { values: string[]; exposedIn: string[] }> = {};

  // Parse prisma schema files.
  const prismaFiles: string[] = [];
  try {
    const entries = await readdir(PRISMA);
    for (const name of entries) {
      if (name.endsWith('.prisma')) prismaFiles.push(join(PRISMA, name));
    }
  } catch {
    // no schema dir
  }
  for (const file of prismaFiles) {
    const source = await readFile(file, 'utf8');
    PRISMA_ENUM_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while (true) {
      match = PRISMA_ENUM_RE.exec(source);
      if (!match) break;
      const [, name, body] = match;
      const values = body
        .split('\n')
        .map((l) => l.replace(/\/\/.*$/, '').trim())
        .filter((l) => l && /^[A-Z_][A-Z0-9_]*$/.test(l));
      if (values.length > 0) {
        enums[name] = { values, exposedIn: [] };
      }
    }
  }

  // Mark enums that appear in DTO response files.
  for (const file of tsFiles) {
    if (!file.includes('/dto/') && !file.includes('/presenters/')) continue;
    const source = await readFile(file, 'utf8');
    for (const enumName of Object.keys(enums)) {
      const needle = new RegExp(`\\b${enumName}\\b`);
      if (needle.test(source)) enums[enumName].exposedIn.push(rel(file));
    }
  }

  const valueCount = Object.values(enums).reduce((acc, e) => acc + e.values.length, 0);
  return {
    summary: { enumCount: Object.keys(enums).length, valueCount },
    enums,
  };
}

// ---------------------------------------------------------------------------
// Notifications discovery
// ---------------------------------------------------------------------------

async function inventoryNotifications(
  files: string[],
  enumsInventory: EnumsInventory,
): Promise<NotificationsInventory> {
  const types: Record<string, { paramsFound: string[]; sources: FileRef[] }> = {};

  const notifEnum = enumsInventory.enums.NotificationType;
  if (!notifEnum) return { summary: { typeCount: 0 }, types };

  for (const value of notifEnum.values) {
    types[value] = { paramsFound: [], sources: [] };
  }

  // Look for string-literal occurrences of each NotificationType value inside
  // the notifications / feed / engagement sources. Widely scanned so we catch
  // enqueues from other bounded contexts too.
  for (const file of files) {
    if (file.endsWith('.spec.ts') || file.endsWith('.test.ts')) continue;
    const source = await readFile(file, 'utf8');
    for (const value of notifEnum.values) {
      const re = new RegExp(`['"]${value}['"]`, 'g');
      let match: RegExpExecArray | null;
      while (true) {
        match = re.exec(source);
        if (!match) break;
        types[value].sources.push({ file: rel(file), line: lineOf(source, match.index) });
      }
    }
  }

  return {
    summary: { typeCount: Object.keys(types).length },
    types,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const files = await walk(SRC);

  const [errors, validation, enums] = await Promise.all([
    inventoryErrors(files),
    inventoryValidation(files),
    inventoryEnums(files),
  ]);
  const notifications = await inventoryNotifications(files, enums);

  await writeFile(join(OUT, 'inventory-errors.json'), `${JSON.stringify(errors, null, 2)}\n`);
  await writeFile(
    join(OUT, 'inventory-validation.json'),
    `${JSON.stringify(validation, null, 2)}\n`,
  );
  await writeFile(join(OUT, 'inventory-enums.json'), `${JSON.stringify(enums, null, 2)}\n`);
  await writeFile(
    join(OUT, 'inventory-notifications.json'),
    `${JSON.stringify(notifications, null, 2)}\n`,
  );

  console.log('=== i18n inventory ===');
  console.log(`errors:`);
  console.log(`  classified:   ${errors.summary.classifiedCount}`);
  console.log(`  ambiguous:    ${errors.summary.ambiguousCount}   ← needs its own code`);
  console.log(
    `  unstable:     ${errors.summary.unstableCount}   ← throw new Error / HttpException`,
  );
  console.log(`  distinct codes: ${errors.summary.distinctCodes}`);
  console.log(
    `validation: ${validation.summary.schemas} Zod object schemas, ${validation.summary.refinements} refinements`,
  );
  console.log(`enums: ${enums.summary.enumCount} enums, ${enums.summary.valueCount} values`);
  console.log(`notifications: ${notifications.summary.typeCount} types`);
  console.log('');
  console.log(`Report written to docs/i18n/inventory-*.json`);
}

// P1-071 — wrap top-level await in try/catch so a walk/read failure
// surfaces with a non-zero exit + readable error instead of an
// unhandled rejection (which Bun prints as a stack with no context).
try {
  await main();
} catch (err) {
  console.error('[i18n-audit] failed:', err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
}
