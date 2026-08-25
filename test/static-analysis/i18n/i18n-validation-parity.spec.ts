/**
 * i18n Validation Catalog Parity Architecture Test
 *
 * `VALIDATION_DICTIONARY` backs the 400 `fields[]` path: every code
 * `zodIssueToCode` can emit — plus custom-refinement codes declared as
 * `params: { code: 'X' }` under `shared-kernel/schemas` — must resolve in
 * BOTH locales, and the dictionary must not carry keys nothing emits.
 *
 * Also pins the two catalogs disjoint: `I18nService` looks a code up in
 * ERROR then VALIDATION, so a shared key would silently shadow.
 */

import { describe, expect, it } from 'bun:test';
import * as path from 'node:path';
import { ERROR_DICTIONARY, LOCALES, VALIDATION_DICTIONARY } from '@packages/i18n';
import { discoverValidationCodes } from '../shared/dictionary-discovery';

const SOURCE_ROOT = path.resolve(__dirname, '../../../src');

describe('i18n validation parity (@packages/i18n VALIDATION_DICTIONARY)', () => {
  const discovered = discoverValidationCodes(SOURCE_ROOT);
  const dictionaryKeys = new Set(Object.keys(VALIDATION_DICTIONARY));

  it('discovery actually found the mapper switch', () => {
    expect(discovered.has('REQUIRED')).toBe(true);
    expect(discovered.has('STRING_TOO_SHORT')).toBe(true);
  });

  it('every emitted validation code has an entry in VALIDATION_DICTIONARY', () => {
    const missing = [...discovered].filter((c) => !dictionaryKeys.has(c)).sort();
    expect(
      missing,
      `VALIDATION_DICTIONARY missing ${missing.length} codes:\n${missing.join('\n')}\n` +
        `Add entries to packages/i18n/src/validation.ts.`,
    ).toEqual([]);
  });

  it('VALIDATION_DICTIONARY has no orphan keys', () => {
    const orphans = [...dictionaryKeys].filter((c) => !discovered.has(c)).sort();
    expect(orphans, `Orphan validation keys:\n${orphans.join('\n')}`).toEqual([]);
  });

  it('VALIDATION_DICTIONARY and ERROR_DICTIONARY are disjoint', () => {
    const overlap = [...dictionaryKeys].filter((c) => Object.hasOwn(ERROR_DICTIONARY, c)).sort();
    expect(overlap, `Codes in both catalogs:\n${overlap.join('\n')}`).toEqual([]);
  });

  it('every entry has non-empty messages for every supported locale', () => {
    const gaps: string[] = [];
    for (const [code, entry] of Object.entries(VALIDATION_DICTIONARY)) {
      for (const locale of LOCALES) {
        const msg = entry[locale];
        if (!msg || msg.trim().length === 0) gaps.push(`${code} (${locale}) is empty`);
      }
    }
    expect(gaps, `Empty translations:\n${gaps.join('\n')}`).toEqual([]);
  });

  it('every message is actually translated (no en === pt-BR copies)', () => {
    const suspects: string[] = [];
    for (const [code, entry] of Object.entries(VALIDATION_DICTIONARY)) {
      const { en, 'pt-BR': pt } = entry as { en: string; 'pt-BR': string };
      if (en === pt) suspects.push(`${code} = "${en}"`);
    }
    expect(suspects, `Untranslated (en === pt-BR):\n${suspects.join('\n')}`).toEqual([]);
  });
});
