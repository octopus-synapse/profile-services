import { describe, expect, it } from 'bun:test';
import { LOCALES } from '@packages/i18n';
import { sectionTypeTranslations } from '../../../prisma/seeds/section-type-translations';

/**
 * Values intentionally identical across locales — loanwords adopted verbatim
 * in pt-BR tech usage. ANY other `en === pt-BR` value is treated as an
 * untranslated copy (a BUG): translate it, or, if it is genuinely a loanword,
 * justify it by adding the `key.field` path here.
 */
const IDENTICAL_ALLOWED = new Set<string>([
  'open_source_v1.label',
  'bug_bounty_v1.title',
  'bug_bounty_v1.label',
  'hackathon_v1.title',
  'hackathon_v1.label',
]);

const USER_FACING_FIELDS = [
  'title',
  'description',
  'label',
  'noDataLabel',
  'placeholder',
  'addLabel',
] as const;

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
        for (const field of [
          'title',
          'description',
          'label',
          'noDataLabel',
          'placeholder',
          'addLabel',
        ] as const) {
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

  it('every user-facing field is actually translated (no en === pt-BR copies)', () => {
    const suspects: string[] = [];
    for (const [key, entry] of Object.entries(sectionTypeTranslations)) {
      const en = entry.en;
      const pt = entry['pt-BR'];
      if (!en || !pt) continue;
      for (const field of USER_FACING_FIELDS) {
        const path = `${key}.${field}`;
        if (en[field] !== undefined && en[field] === pt[field] && !IDENTICAL_ALLOWED.has(path)) {
          suspects.push(`${path} = "${en[field]}"`);
        }
      }
    }
    expect(
      suspects,
      `Untranslated section-type fields (en === pt-BR):\n${suspects.join('\n')}\n\n` +
        `Translate the pt-BR value, or if it is a loanword used verbatim add the path to IDENTICAL_ALLOWED.`,
    ).toEqual([]);
  });
});
