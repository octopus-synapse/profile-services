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
 * Discovery is delegated to test/static-analysis/shared/dictionary-discovery.ts
 * (see Q60 in the duplication audit).
 */

import { describe, expect, it } from 'bun:test';
import * as path from 'node:path';
import { ERROR_DICTIONARY, LOCALES } from '@packages/i18n';
import { discoverErrorCodes } from '../shared/dictionary-discovery';

const SOURCE_ROOT = path.resolve(__dirname, '../../../src');

describe('i18n catalog parity (@packages/i18n ERROR_DICTIONARY)', () => {
  const discovered = discoverErrorCodes(SOURCE_ROOT);
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
      `Entries with raw \${ ... } template leakage. Use { param } named placeholders instead.\n${leaks.join('\n')}`,
    ).toEqual([]);
  });

  // Note: we intentionally do not assert `en !== 'pt-BR'` here — the
  // `as const satisfies LocalizedDictionary` annotation on `ERROR_DICTIONARY`
  // proves this at compile time (the literal types are disjoint, so TS
  // won't even let you write a mirror entry).
});
