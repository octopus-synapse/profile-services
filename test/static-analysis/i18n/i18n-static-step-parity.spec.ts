import { describe, expect, it } from 'bun:test';
import { LOCALES, STATIC_STEP_DICTIONARY } from '@packages/i18n';

describe('i18n static-step parity (@packages/i18n STATIC_STEP_DICTIONARY)', () => {
  it('every entry covers exactly LOCALES — no missing, no rogue locale', () => {
    const errors: string[] = [];
    for (const [id, localeMap] of Object.entries(STATIC_STEP_DICTIONARY)) {
      for (const locale of LOCALES) {
        if (!(locale in localeMap)) {
          errors.push(`step '${id}' missing locale '${locale}'`);
        }
      }
      for (const locale of Object.keys(localeMap)) {
        if (!(LOCALES as readonly string[]).includes(locale)) {
          errors.push(`step '${id}' has rogue locale '${locale}'`);
        }
      }
    }
    expect(errors, `STATIC_STEP_DICTIONARY locale parity failures:\n${errors.join('\n')}`).toEqual(
      [],
    );
  });

  it('every step has non-empty label and description in every locale', () => {
    const gaps: string[] = [];
    for (const [id, localeMap] of Object.entries(STATIC_STEP_DICTIONARY)) {
      for (const locale of LOCALES) {
        const entry = localeMap[locale];
        if (!entry) continue;
        if (!entry.label || entry.label.trim().length === 0)
          gaps.push(`step '${id}' (${locale}): empty label`);
        if (!entry.description || entry.description.trim().length === 0)
          gaps.push(`step '${id}' (${locale}): empty description`);
      }
    }
    expect(gaps, `Empty step strings:\n${gaps.join('\n')}`).toEqual([]);
  });

  it('STATIC_STEP_DICTIONARY is non-empty', () => {
    expect(Object.keys(STATIC_STEP_DICTIONARY).length).toBeGreaterThan(0);
  });
});
