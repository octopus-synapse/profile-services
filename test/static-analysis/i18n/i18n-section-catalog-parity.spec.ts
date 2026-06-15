import { describe, expect, it } from 'bun:test';
import { allFieldTranslations } from '../../../prisma/seeds/field-translations';
import { sectionTypeTranslations } from '../../../prisma/seeds/section-type-translations';
import { sectionTypes } from '../../../prisma/seeds/section-type.seed';

/**
 * Catalog ↔ translations completeness. The section-type catalog
 * (prisma/seeds/section-type.seed.ts) is the source of truth: every catalog
 * section type and every VISIBLE field MUST have a matching translation entry,
 * and there must be NO orphan translations (keyed to a type/field that no
 * longer exists). Drift here is the exact bug that makes a label render in raw
 * English — there is no runtime fallback to hide it, so it must fail in CI.
 */

type CatalogField = { key?: string; meta?: { hidden?: boolean } };

function visibleFieldKeys(sectionKey: string): string[] {
  const section = sectionTypes.find((s) => s.key === sectionKey);
  const def = section?.definition as { fields?: CatalogField[] } | undefined;
  return (def?.fields ?? [])
    .filter((f): f is CatalogField & { key: string } => Boolean(f.key) && f.meta?.hidden !== true)
    .map((f) => f.key);
}

const catalogKeys = sectionTypes.map((s) => s.key);

describe('i18n section catalog ↔ translations parity', () => {
  it('every catalog section type has a section-type translation (and none is orphan)', () => {
    const errors: string[] = [];
    for (const key of catalogKeys) {
      if (!(key in sectionTypeTranslations)) {
        errors.push(`catalog '${key}' has NO section-type translation`);
      }
    }
    for (const key of Object.keys(sectionTypeTranslations)) {
      if (!catalogKeys.includes(key)) {
        errors.push(`section-type translation '${key}' is ORPHAN (no catalog section type)`);
      }
    }
    expect(errors, `Section-type catalog parity failures:\n${errors.join('\n')}`).toEqual([]);
  });

  it('every visible catalog field has a field translation (and none is orphan)', () => {
    const errors: string[] = [];
    for (const key of catalogKeys) {
      const visible = visibleFieldKeys(key);
      const map = allFieldTranslations[key] ?? {};
      const transKeys = Object.keys(map);

      for (const fieldKey of visible) {
        if (!transKeys.includes(fieldKey)) {
          errors.push(`'${key}.${fieldKey}' is a visible field with NO translation`);
        }
      }
      for (const fieldKey of transKeys) {
        if (!visible.includes(fieldKey)) {
          errors.push(`'${key}.${fieldKey}' field translation is ORPHAN (not a visible catalog field)`);
        }
      }
    }
    expect(errors, `Field catalog parity failures:\n${errors.join('\n')}`).toEqual([]);
  });

  it('no field-translation map exists for a non-catalog section type', () => {
    const errors: string[] = [];
    for (const key of Object.keys(allFieldTranslations)) {
      if (!catalogKeys.includes(key)) {
        errors.push(`field-translation map '${key}' is ORPHAN (no catalog section type)`);
      }
    }
    expect(errors, `Orphan field-translation maps:\n${errors.join('\n')}`).toEqual([]);
  });
});
