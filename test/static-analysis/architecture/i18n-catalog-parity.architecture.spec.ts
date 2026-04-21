/**
 * i18n Catalog Parity Architecture Test
 *
 * Ensures that every stable error code emitted by a concrete DomainException
 * subclass has a matching entry in BOTH locale catalogs (pt-BR and en), and
 * that catalogs have no orphan keys that don't map to any code in the source.
 *
 * This test is the PR-time guarantee that no production request ever hits
 * `MissingTranslationError` — the filter's loud crash on missing catalog
 * entries is a last-resort safety net, not the primary defense.
 *
 * Runs via static parsing of `src/**\/*.ts` (no module import) so it stays
 * fast and resilient to bootstrap-time regressions.
 */

import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SOURCE_ROOT = 'src';
const EN_PATH = 'src/bounded-contexts/platform/i18n/messages/errors.en.json';
const PT_PATH = 'src/bounded-contexts/platform/i18n/messages/errors.pt-BR.json';

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

describe('i18n catalog parity', () => {
  const discovered = discoverCodes();
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8')) as Record<string, string>;
  const pt = JSON.parse(fs.readFileSync(PT_PATH, 'utf8')) as Record<string, string>;

  it('every DomainException code has an entry in the en catalog', () => {
    const missing = [...discovered].filter((c) => !Object.hasOwn(en, c)).sort();
    expect(
      missing,
      `en catalog missing ${missing.length} codes:\n${missing.join('\n')}\n` +
        `Run: bun run scripts/seed-i18n-catalogs.ts to populate placeholders.`,
    ).toEqual([]);
  });

  it('every DomainException code has an entry in the pt-BR catalog', () => {
    const missing = [...discovered].filter((c) => !Object.hasOwn(pt, c)).sort();
    expect(
      missing,
      `pt-BR catalog missing ${missing.length} codes:\n${missing.join('\n')}\n` +
        `Run: bun run scripts/seed-i18n-catalogs.ts to populate placeholders.`,
    ).toEqual([]);
  });

  it('en catalog has no orphan keys (codes that no class emits)', () => {
    const orphans = Object.keys(en)
      .filter((c) => !discovered.has(c))
      .sort();
    expect(orphans, `en catalog has ${orphans.length} orphan keys:\n${orphans.join('\n')}`).toEqual(
      [],
    );
  });

  it('pt-BR catalog has no orphan keys (codes that no class emits)', () => {
    const orphans = Object.keys(pt)
      .filter((c) => !discovered.has(c))
      .sort();
    expect(
      orphans,
      `pt-BR catalog has ${orphans.length} orphan keys:\n${orphans.join('\n')}`,
    ).toEqual([]);
  });

  it('en and pt-BR catalogs have identical keys', () => {
    const enKeys = new Set(Object.keys(en));
    const ptKeys = new Set(Object.keys(pt));
    const onlyEn = [...enKeys].filter((k) => !ptKeys.has(k)).sort();
    const onlyPt = [...ptKeys].filter((k) => !enKeys.has(k)).sort();
    expect(
      { onlyEn, onlyPt },
      `Catalogs diverge:\n  only in en: ${onlyEn.join(', ')}\n  only in pt-BR: ${onlyPt.join(', ')}`,
    ).toEqual({ onlyEn: [], onlyPt: [] });
  });

  it('no catalog entry contains unresolved template-literal leakage', () => {
    const leaks: string[] = [];
    for (const [code, msg] of Object.entries(en)) {
      if (msg.includes('${')) leaks.push(`en: ${code}`);
    }
    for (const [code, msg] of Object.entries(pt)) {
      if (msg.includes('${')) leaks.push(`pt-BR: ${code}`);
    }
    expect(
      leaks,
      `Catalog entries contain raw \${...} template leakage. Use {param} named placeholders instead.\n${leaks.join('\n')}`,
    ).toEqual([]);
  });
});
