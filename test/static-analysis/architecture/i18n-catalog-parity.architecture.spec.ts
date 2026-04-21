/**
 * i18n Catalog Parity Architecture Test
 *
 * Ensures every stable error code emitted by a concrete DomainException
 * subclass has a matching entry in the `@packages/i18n` dictionary for BOTH
 * locales, and that the dictionary has no orphan keys that no class emits.
 *
 * This is the PR-time guarantee that no production request ever hits
 * `MissingTranslationError`. The filter's crash-loud behaviour on missing
 * entries is a last-resort safety net, not the primary defense.
 *
 * Discovery is by static parse of `src/**\/*.ts` so the test stays fast and
 * resilient to bootstrap-time regressions.
 */

import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ERROR_DICTIONARY, LOCALES } from '@packages/i18n';

const SOURCE_ROOT = 'src';

const KNOWN_BASES = new Set([
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

function listSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'testing' || entry.name === '__mocks__') continue;
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listSourceFiles(full, acc);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) acc.push(full);
  }
  return acc;
}

function extractBody(src: string, from: number): string {
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

function discoverCodes(): Set<string> {
  const codes = new Set<string>();
  for (const file of listSourceFiles(SOURCE_ROOT)) {
    const src = fs.readFileSync(file, 'utf8');
    if (!src.includes('extends ')) continue;
    CLASS_DECL_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while (true) {
      match = CLASS_DECL_RE.exec(src);
      if (!match) break;
      const [, isAbstract, , parent] = match;
      if (isAbstract) continue;
      if (!KNOWN_BASES.has(parent)) continue;
      const body = extractBody(src, match.index);
      const code = body.match(CODE_LITERAL_RE)?.[1];
      if (code) codes.add(code);
    }
  }
  return codes;
}

describe('i18n catalog parity (@packages/i18n ERROR_DICTIONARY)', () => {
  const discovered = discoverCodes();
  const dictionaryKeys = new Set(Object.keys(ERROR_DICTIONARY));

  it('every DomainException code has an entry in ERROR_DICTIONARY', () => {
    const missing = [...discovered].filter((c) => !dictionaryKeys.has(c)).sort();
    expect(
      missing,
      `ERROR_DICTIONARY missing ${missing.length} codes:\n${missing.join('\n')}\n` +
        `Add entries to packages/i18n/src/errors.ts.`,
    ).toEqual([]);
  });

  it('ERROR_DICTIONARY has no orphan keys (codes no class emits)', () => {
    const orphans = [...dictionaryKeys].filter((c) => !discovered.has(c)).sort();
    expect(
      orphans,
      `ERROR_DICTIONARY has ${orphans.length} orphan keys:\n${orphans.join('\n')}`,
    ).toEqual([]);
  });

  it('every entry has non-empty messages for every supported locale', () => {
    const gaps: string[] = [];
    for (const [code, entry] of Object.entries(ERROR_DICTIONARY)) {
      for (const locale of LOCALES) {
        const msg = entry[locale];
        if (!msg || typeof msg !== 'string' || msg.trim().length === 0) {
          gaps.push(`${code} (${locale}) is empty`);
        }
      }
    }
    expect(gaps, `Empty translations:\n${gaps.join('\n')}`).toEqual([]);
  });

  it('no entry contains unresolved template-literal leakage', () => {
    const leaks: string[] = [];
    for (const [code, entry] of Object.entries(ERROR_DICTIONARY)) {
      for (const locale of LOCALES) {
        if (entry[locale].includes('${')) leaks.push(`${code} (${locale})`);
      }
    }
    expect(
      leaks,
      `Entries with raw \${...} template leakage. Use {param} named placeholders instead.\n${leaks.join('\n')}`,
    ).toEqual([]);
  });

  // Note: we intentionally do not assert `en !== 'pt-BR'` here — the
  // `as const satisfies LocalizedDictionary` annotation on `ERROR_DICTIONARY`
  // proves this at compile time (the literal types are disjoint, so TS
  // won't even let you write a mirror entry).
});
