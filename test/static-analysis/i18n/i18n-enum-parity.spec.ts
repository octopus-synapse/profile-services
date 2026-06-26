/**
 * i18n Enum Parity Architecture Test
 *
 * Ensures every Prisma enum declared in `prisma/schema/*.prisma` has a
 * matching translation in `ENUM_DICTIONARY`, and every dictionary entry
 * points at a real enum value.
 *
 * Discovery is delegated to test/static-analysis/shared/dictionary-discovery.ts
 * (Q60 in the duplication audit).
 */

import { describe, expect, it } from 'bun:test';
import { ENUM_DICTIONARY, LOCALES } from '@packages/i18n';
import { discoverPrismaEnums } from '../shared/dictionary-discovery';

const SCHEMA_DIR = 'prisma/schema';

describe('i18n enum parity (@packages/i18n ENUM_DICTIONARY)', () => {
  const discovered = discoverPrismaEnums(SCHEMA_DIR);

  it('every Prisma enum appears in ENUM_DICTIONARY', () => {
    const missing = Object.keys(discovered)
      .filter((name) => !Object.hasOwn(ENUM_DICTIONARY, name))
      .sort();
    expect(
      missing,
      `ENUM_DICTIONARY missing ${missing.length} enum(s):\n${missing.join('\n')}\n` +
        `Add entries to packages/i18n/src/enums.ts.`,
    ).toEqual([]);
  });

  it('every ENUM_DICTIONARY key is a real Prisma enum', () => {
    const orphans = Object.keys(ENUM_DICTIONARY)
      .filter((name) => !Object.hasOwn(discovered, name))
      .sort();
    expect(orphans, `Orphan enums in dictionary:\n${orphans.join('\n')}`).toEqual([]);
  });

  it('every enum value has a dictionary entry', () => {
    const missing: string[] = [];
    for (const [name, values] of Object.entries(discovered)) {
      const dict = (ENUM_DICTIONARY as Record<string, Record<string, unknown>>)[name];
      if (!dict) continue;
      for (const v of values) {
        if (!Object.hasOwn(dict, v)) missing.push(`${name}.${v}`);
      }
    }
    expect(missing.sort(), `Missing enum translations:\n${missing.join('\n')}`).toEqual([]);
  });

  it('every dictionary value maps to a real enum value', () => {
    const orphans: string[] = [];
    for (const [name, entry] of Object.entries(ENUM_DICTIONARY)) {
      const real = discovered[name];
      if (!real) continue;
      for (const v of Object.keys(entry)) {
        if (!real.has(v)) orphans.push(`${name}.${v}`);
      }
    }
    expect(orphans.sort(), `Orphan enum values:\n${orphans.join('\n')}`).toEqual([]);
  });

  it('every entry is a non-empty string in every locale', () => {
    const gaps: string[] = [];
    for (const [name, entry] of Object.entries(ENUM_DICTIONARY)) {
      for (const [value, msgs] of Object.entries(entry)) {
        for (const locale of LOCALES) {
          const msg = (msgs as Record<string, string>)[locale];
          if (!msg || msg.trim().length === 0) gaps.push(`${name}.${value} (${locale})`);
        }
      }
    }
    expect(gaps, `Empty enum translations:\n${gaps.join('\n')}`).toEqual([]);
  });

  it('every value is actually translated (no en === pt-BR copies)', () => {
    // Loanwords, acronyms and brand names that are genuinely identical in
    // pt-BR. Anything NOT listed here that matches en === pt-BR is an
    // untranslated copy — translate it, or justify it by adding the path here.
    const IDENTICAL_ALLOWED = new Set<string>([
      'AnalyticsEvent.DOWNLOAD',
      'BadgeKind.ATS_90_PLUS',
      'CollaboratorRole.EDITOR',
      'DevicePlatform.ANDROID',
      'DevicePlatform.IOS',
      'DevicePlatform.WEB',
      'ImportSource.DOCX',
      'ImportSource.GITHUB',
      'ImportSource.JSON',
      'ImportSource.LINKEDIN',
      'ImportSource.PDF',
      'JobType.FREELANCE',
      'LinkKind.GITHUB',
      'LinkKind.LINKEDIN',
      'PaymentCurrency.BRL',
      'PaymentCurrency.EUR',
      'PaymentCurrency.GBP',
      'DegreeType.BOOTCAMP',
      'LanguageLevel.A1',
      'LanguageLevel.A2',
      'LanguageLevel.B1',
      'LanguageLevel.B2',
      'LanguageLevel.C1',
      'LanguageLevel.C2',
      'PaymentCurrency.USD',
      'RoleSeniority.TRAINEE',
      'RoleTitleSource.CBO',
      'RoleTitleSource.ESCO',
      'RoleTitleSource.ONET',
      'SkillType.FRAMEWORK',
      'SkillType.SOFT_SKILL',
      'TechAreaType.DESIGN',
      'TechAreaType.DEVOPS',
      'TechAreaType.QA',
    ]);
    const suspects: string[] = [];
    for (const [name, entry] of Object.entries(ENUM_DICTIONARY)) {
      for (const [value, msgs] of Object.entries(entry)) {
        const m = msgs as Record<string, string>;
        const path = `${name}.${value}`;
        if (m.en === m['pt-BR'] && !IDENTICAL_ALLOWED.has(path)) {
          suspects.push(`${path} = "${m.en}"`);
        }
      }
    }
    expect(
      suspects,
      `Untranslated enum values (en === pt-BR):\n${suspects.join('\n')}\n\n` +
        `Translate the pt-BR value, or if it is a loanword/acronym/brand add the path to IDENTICAL_ALLOWED.`,
    ).toEqual([]);
  });
});
