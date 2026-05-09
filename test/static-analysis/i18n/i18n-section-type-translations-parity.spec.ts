import { describe, expect, it } from 'bun:test';
import { LOCALES } from '@packages/i18n';
import { sectionTypeTranslations } from '../../../prisma/seeds/section-type-translations';

describe('i18n section-type translations parity (prisma/seeds/section-type-translations)', () => {
  it('every section type covers exactly LOCALES — no missing, no rogue locale', () => {
    const errors: string[] = [];
    for (const [key, entry] of Object.entries(sectionTypeTranslations)) {
      for (const locale of LOCALES) {
        if (!(locale in entry)) {
          errors.push(`'${key}' missing locale '${locale}'`);
        }
      }
      for (const locale of Object.keys(entry)) {
        if (!(LOCALES as readonly string[]).includes(locale)) {
          errors.push(`'${key}' has rogue locale '${locale}'`);
        }
      }
    }
    expect(
      errors,
      `section-type-translations locale parity failures:\n${errors.join('\n')}`,
    ).toEqual([]);
  });

  it('every entry has non-empty required fields in every locale', () => {
    const gaps: string[] = [];
    for (const [key, entry] of Object.entries(sectionTypeTranslations)) {
      for (const locale of LOCALES) {
        const t = entry[locale];
        if (!t) continue;
        for (const field of ['title', 'label', 'noDataLabel', 'placeholder', 'addLabel'] as const) {
          if (!t[field] || t[field].trim().length === 0) {
            gaps.push(`'${key}' (${locale}): empty '${field}'`);
          }
        }
      }
    }
    expect(gaps, `Empty section-type translation fields:\n${gaps.join('\n')}`).toEqual([]);
  });

  it('sectionTypeTranslations is non-empty', () => {
    expect(Object.keys(sectionTypeTranslations).length).toBeGreaterThan(0);
  });
});
