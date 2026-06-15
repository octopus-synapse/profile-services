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

  it('every field has a non-empty label in every locale', () => {
    const gaps: string[] = [];
    for (const [sectionKey, map] of Object.entries(allFieldTranslations)) {
      for (const [fieldKey, entry] of Object.entries(map)) {
        for (const locale of LOCALES) {
          const t = entry[locale];
          if (!t || !t.label || t.label.trim().length === 0) {
            gaps.push(`${sectionKey}['${fieldKey}'] (${locale}): empty label`);
          }
          // Optional sub-fields, if present, must not be empty strings.
          for (const sub of ['placeholder', 'helpText'] as const) {
            if (t && sub in t && (!t[sub] || String(t[sub]).trim().length === 0)) {
              gaps.push(`${sectionKey}['${fieldKey}'] (${locale}): empty '${sub}'`);
            }
          }
        }
      }
    }
    expect(gaps, `Empty field-translation values:\n${gaps.join('\n')}`).toEqual([]);
  });

  it('every field label is actually translated (no en === pt-BR copies)', () => {
    const suspects: string[] = [];
    for (const [sectionKey, map] of Object.entries(allFieldTranslations)) {
      for (const [fieldKey, entry] of Object.entries(map)) {
        const en = entry.en;
        const pt = entry['pt-BR'];
        if (!en || !pt) continue;
        if (en.label !== undefined && en.label === pt.label) {
          suspects.push(`${sectionKey}.${fieldKey}.label = "${en.label}"`);
        }
      }
    }
    expect(
      suspects,
      `Untranslated field labels (en === pt-BR):\n${suspects.join('\n')}`,
    ).toEqual([]);
  });
});
