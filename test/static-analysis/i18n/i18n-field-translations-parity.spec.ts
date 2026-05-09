import { describe, expect, it } from 'bun:test';
import { LOCALES } from '@packages/i18n';
import { allFieldTranslations } from '../../../prisma/seeds/field-translations';

describe('i18n field translations parity (prisma/seeds/field-translations)', () => {
  it('every field covers exactly LOCALES — no missing, no rogue locale', () => {
    const errors: string[] = [];
    for (const [sectionKey, map] of Object.entries(allFieldTranslations)) {
      for (const [fieldKey, entry] of Object.entries(map)) {
        for (const locale of LOCALES) {
          if (!(locale in entry)) {
            errors.push(`${sectionKey}['${fieldKey}'] missing locale '${locale}'`);
          }
        }
        for (const locale of Object.keys(entry)) {
          if (!(LOCALES as readonly string[]).includes(locale)) {
            errors.push(`${sectionKey}['${fieldKey}'] has rogue locale '${locale}'`);
          }
        }
      }
    }
    expect(errors, `field-translations locale parity failures:\n${errors.join('\n')}`).toEqual([]);
  });

  it('allFieldTranslations covers at least one section', () => {
    expect(Object.keys(allFieldTranslations).length).toBeGreaterThan(0);
  });
});
