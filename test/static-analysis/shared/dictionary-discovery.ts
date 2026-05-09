/**
 * Discovery helpers for the three i18n parity tests.
 *
 * Centralises the file-walking, AST-ish parsing, and Prisma-enum scraping
 * that previously lived inline in
 *   - test/static-analysis/i18n/i18n-error-parity.spec.ts
 *   - test/static-analysis/i18n/i18n-enum-parity.spec.ts
 *   - test/static-analysis/i18n/i18n-notification-parity.spec.ts
 *   - test/static-analysis/i18n/i18n-success-message-parity.spec.ts
 *
 * Q60 in the duplication audit. Each spec stays small and assertion-only.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Constants reused across discovery passes ──────────────────────────

const KNOWN_DOMAIN_EXCEPTION_BASES = new Set([
  'DomainException',
  'EntityNotFoundException',
  'ConflictException',
  'UnauthorizedException',
  'ForbiddenException',
  'ValidationException',
  'BusinessRuleViolationException',
  'LimitExceededException',
  'OnboardingValidationException',
]);

const CLASS_DECL_RE = /export\s+(abstract\s+)?class\s+(\w+)\s+extends\s+([A-Za-z_][\w]*)/g;
const CODE_LITERAL_RE = /readonly\s+code(?:\s*:\s*string)?\s*=\s*['"]([A-Z][A-Z0-9_]*)['"]/;
// `domainCode('CODE', ...)` calls — the canonical builder for non-throwable
// catalog emissions (validation results, etc — see Q8b in CLAUDE.md).
const DOMAIN_CODE_CALL_RE = /\bdomainCode\(\s*['"]([A-Z][A-Z0-9_]*)['"]/g;
const PRISMA_ENUM_RE = /^enum\s+(\w+)\s*\{([\s\S]*?)\}/gm;
const NOTIFICATION_ENUM_RE = /enum\s+NotificationType\s*\{([\s\S]*?)\}/;
const ENUM_VALUE_RE = /^[A-Z][A-Z0-9_]*$/;

// ─── File walking ──────────────────────────────────────────────────────

export interface WalkOptions {
  /** Directory names to skip (matched against `entry.name`). */
  skipDirs?: ReadonlyArray<string>;
  /** File-name predicate; return `true` to keep the file. */
  filter?: (name: string) => boolean;
}

const DEFAULT_SKIP = ['node_modules', 'testing', '__mocks__', '__tests__'];

/**
 * Recursively list source files under `dir`. Skips dot-dirs by default
 * plus `DEFAULT_SKIP`.
 */
export function listSourceFiles(dir: string, opts: WalkOptions = {}): string[] {
  const skip = new Set(opts.skipDirs ?? DEFAULT_SKIP);
  const filter = opts.filter ?? ((name) => name.endsWith('.ts') && !name.endsWith('.spec.ts'));
  const acc: string[] = [];
  walk(dir, skip, filter, acc);
  return acc;
}

function walk(dir: string, skip: Set<string>, filter: (name: string) => boolean, acc: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, skip, filter, acc);
    } else if (filter(entry.name)) {
      acc.push(full);
    }
  }
}

// ─── Error code discovery ──────────────────────────────────────────────

function extractClassBody(src: string, from: number): string {
  const open = src.indexOf('{', from);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open);
}

/**
 * Scan every `.ts` source file for codes the application emits to the
 * i18n catalog. Two emission paths today:
 *
 *   1. `class XxxException extends DomainException { readonly code = 'CODE' }`
 *      — thrown, caught by error.mapper, translated for the response.
 *   2. `domainCode('CODE', { ...params })` calls — the non-throwable
 *      builder used by validation results returned in 200 bodies (Q8b).
 *
 * Both paths land at `i18n.translate(code, params, locale)`, so the
 * parity test must consider both as legitimate emitters before flagging
 * a dictionary entry as orphan.
 */
export function discoverErrorCodes(sourceRoot: string): Set<string> {
  const codes = new Set<string>();
  for (const file of listSourceFiles(sourceRoot)) {
    const src = fs.readFileSync(file, 'utf8');

    // (1) DomainException subclasses.
    if (src.includes('extends ')) {
      CLASS_DECL_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while (true) {
        match = CLASS_DECL_RE.exec(src);
        if (!match) break;
        const [, isAbstract, , parent] = match;
        if (isAbstract) continue;
        if (!KNOWN_DOMAIN_EXCEPTION_BASES.has(parent)) continue;
        const body = extractClassBody(src, match.index);
        const code = body.match(CODE_LITERAL_RE)?.[1];
        if (code) codes.add(code);
      }
    }

    // (2) `domainCode('CODE', ...)` builder calls.
    if (src.includes('domainCode(')) {
      DOMAIN_CODE_CALL_RE.lastIndex = 0;
      let dcMatch: RegExpExecArray | null;
      while (true) {
        dcMatch = DOMAIN_CODE_CALL_RE.exec(src);
        if (!dcMatch) break;
        codes.add(dcMatch[1]);
      }
    }
  }
  return codes;
}

// ─── Prisma enum discovery ─────────────────────────────────────────────

/**
 * Parse every `enum X { ... }` block from `prisma/schema/*.prisma` and
 * return a `{ enumName: Set<value> }` map.
 */
export function discoverPrismaEnums(schemaDir: string): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const entry of fs.readdirSync(schemaDir)) {
    if (!entry.endsWith('.prisma')) continue;
    const src = fs.readFileSync(path.join(schemaDir, entry), 'utf8');
    PRISMA_ENUM_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while (true) {
      match = PRISMA_ENUM_RE.exec(src);
      if (!match) break;
      const [, name, body] = match;
      out[name] = parseEnumBody(body);
    }
  }
  return out;
}

/**
 * Locate the `NotificationType` enum specifically and return its values.
 * Throws when missing — exists because the parity test treats absence as
 * a hard configuration error rather than an empty set.
 */
export function discoverNotificationTypes(schemaDir: string): Set<string> {
  for (const entry of fs.readdirSync(schemaDir)) {
    if (!entry.endsWith('.prisma')) continue;
    const src = fs.readFileSync(path.join(schemaDir, entry), 'utf8');
    const match = src.match(NOTIFICATION_ENUM_RE);
    if (!match) continue;
    return parseEnumBody(match[1]);
  }
  throw new Error('NotificationType enum not found in prisma/schema');
}

function parseEnumBody(body: string): Set<string> {
  return new Set(
    body
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, '').trim())
      .filter((l) => l.length > 0 && ENUM_VALUE_RE.test(l)),
  );
}

// ─── Success-message code discovery ───────────────────────────────────

const SUCCESS_CODE_AFTER_KEY_RE =
  /code:[^,;}\n]*?'([A-Z][A-Z0-9_]{3,})'(?:[^,;}\n]*?'([A-Z][A-Z0-9_]{3,})')?/g;

/**
 * Scan route files for `{ code: 'X' }` patterns that flow into
 * `renderSuccessMessageForRequest`. Only captures string literals directly
 * after a `code:` key (handles ternaries like `code: flag ? 'A' : 'B'`)
 * within `return {` context, and skips lines that look like error-code
 * arrays (`blockers.push`, `errors:`, etc.).
 */
export function discoverSuccessMessageCodes(sourceRoot: string): Set<string> {
  const codes = new Set<string>();
  const files = listSourceFiles(sourceRoot, {
    filter: (name) => name.endsWith('.routes.ts') && !name.endsWith('.spec.ts'),
  });
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    if (!src.includes('code:')) continue;
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('code:')) continue;
      if (/\b(?:blockers|errors|issues|warnings)\b/.test(line)) continue;
      if (/\.push\s*\(/.test(line)) continue;
      const window = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
      if (!/return\s*\{/.test(window)) continue;
      SUCCESS_CODE_AFTER_KEY_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while (true) {
        m = SUCCESS_CODE_AFTER_KEY_RE.exec(line);
        if (!m) break;
        if (m[1]) codes.add(m[1]);
        if (m[2]) codes.add(m[2]);
      }
    }
  }
  return codes;
}
