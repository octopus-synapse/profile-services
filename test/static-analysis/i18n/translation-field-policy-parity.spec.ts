import { describe, expect, it } from 'bun:test';
import { sectionTypes } from '../../../prisma/seeds/shared/section-type.seed';
import {
  FIELD_TRANSLATION_POLICY,
  isFieldTranslatable,
  lookupFieldTranslationDecision,
  selectTranslatableFieldKeys,
} from '../../../src/bounded-contexts/translation/domain/policies/field-translation.policy';
import { SEMANTIC_ROLE } from '../../../src/shared-kernel/schemas/sections/semantic-role.const';

/**
 * ADR-003 §5 parity: the machine-translation policy is keyed by
 * `(sectionTypeKey, semanticRole)` and must stay exhaustive over the seeded
 * section catalog.
 *
 * The failure this guards is silence. A new section type — or one new field on
 * an existing one — must not quietly inherit "not translated"; someone has to
 * look at the field and write down a decision. That is what makes the policy a
 * policy rather than a default.
 */

interface RawSeedField {
  key?: string;
  semanticRole?: string;
  fields?: RawSeedField[];
}

/** A seed field that actually declares a key — the only kind worth policing. */
interface SeedField extends RawSeedField {
  key: string;
}

function flattenFields(fields: RawSeedField[] | undefined): SeedField[] {
  const out: SeedField[] = [];
  for (const field of fields ?? []) {
    if (field.key) out.push(field as SeedField);
    if (field.fields) out.push(...flattenFields(field.fields));
  }
  return out;
}

function seedFieldsFor(sectionType: (typeof sectionTypes)[number]): SeedField[] {
  return flattenFields((sectionType.definition as { fields?: RawSeedField[] }).fields);
}

describe('translation field policy parity (ADR-003 §5)', () => {
  it('every seeded section type has a policy entry', () => {
    const missing = sectionTypes
      .map((s) => s.key)
      .filter((key) => !(key in FIELD_TRANSLATION_POLICY));

    expect(
      missing,
      `Section types with no machine-translation policy:\n${missing.join('\n')}\n\n` +
        `Add each to FIELD_TRANSLATION_POLICY in ` +
        `src/bounded-contexts/translation/domain/policies/field-translation.policy.ts, ` +
        `recording a decision per semantic role. Do not let a new section type ` +
        `default to "not translated" silently — ADR-003 §5.`,
    ).toEqual([]);
  });

  it('every field of every seeded section type has a recorded decision', () => {
    const gaps: string[] = [];

    for (const sectionType of sectionTypes) {
      for (const field of seedFieldsFor(sectionType)) {
        if (!field.semanticRole) {
          gaps.push(`${sectionType.key}.${field.key} has no semanticRole in the seed`);
          continue;
        }
        if (lookupFieldTranslationDecision(sectionType.key, field.semanticRole) === null) {
          gaps.push(
            `${sectionType.key} / ${field.semanticRole} (field '${field.key}') — undecided`,
          );
        }
      }
    }

    expect(
      gaps,
      `Fields with no machine-translation decision:\n${gaps.join('\n')}\n\n` +
        `Each needs an explicit YES(...) or NO(...) with a reason.`,
    ).toEqual([]);
  });

  it('carries no policy entry for a section type or role the seed dropped', () => {
    const seedPairs = new Set<string>();
    for (const sectionType of sectionTypes) {
      for (const field of seedFieldsFor(sectionType)) {
        if (field.semanticRole) seedPairs.add(`${sectionType.key}/${field.semanticRole}`);
      }
    }

    const stale: string[] = [];
    for (const [sectionKey, rolePolicy] of Object.entries(FIELD_TRANSLATION_POLICY)) {
      for (const role of Object.keys(rolePolicy)) {
        if (!seedPairs.has(`${sectionKey}/${role}`)) stale.push(`${sectionKey} / ${role}`);
      }
    }

    expect(
      stale,
      `Policy entries with no matching seeded field (delete them):\n${stale.join('\n')}`,
    ).toEqual([]);
  });

  it('every decision carries a non-empty reason', () => {
    const blank: string[] = [];
    for (const [sectionKey, rolePolicy] of Object.entries(FIELD_TRANSLATION_POLICY)) {
      for (const [role, decision] of Object.entries(rolePolicy)) {
        if (!decision.reason || decision.reason.trim().length === 0) {
          blank.push(`${sectionKey} / ${role}`);
        }
      }
    }
    expect(blank).toEqual([]);
  });

  it('holds the ADR-003 §5 fixed points that the semantic role alone gets wrong', () => {
    // SKILL_NAME flips on the section.
    expect(isFieldTranslatable('skill_set_v1', 'SKILL_NAME')).toBe(false);
    expect(isFieldTranslatable('soft_skill_set_v1', 'SKILL_NAME')).toBe(true);

    // TITLE flips on the section.
    expect(isFieldTranslatable('award_v1', 'TITLE')).toBe(true);
    expect(isFieldTranslatable('certification_v1', 'TITLE')).toBe(false);
  });

  it('translates DESCRIPTION in exactly the 11 sections ADR-003 counts', () => {
    const withDescription = sectionTypes
      .filter((s) => seedFieldsFor(s).some((f) => f.semanticRole === 'DESCRIPTION'))
      .map((s) => s.key);

    expect(withDescription.length).toBe(11);
    for (const key of withDescription) {
      expect(isFieldTranslatable(key, 'DESCRIPTION'), `${key}/DESCRIPTION`).toBe(true);
    }
  });

  it('never translates a locator, an organization name, or a date', () => {
    const neverTranslate = new Set([
      'URL',
      'REPOSITORY_URL',
      'PROOF_URL',
      'EMAIL',
      'PHONE',
      'ORGANIZATION',
      'ORGANIZATION_DOMAIN',
      'PERSON_NAME',
      'START_DATE',
      'END_DATE',
      'ISSUE_DATE',
      'EXPIRY_DATE',
      'EVENT_DATE',
      'DISCOVERY_DATE',
      'ACHIEVEMENT_DATE',
    ]);

    const violations: string[] = [];
    for (const [sectionKey, rolePolicy] of Object.entries(FIELD_TRANSLATION_POLICY)) {
      for (const [role, decision] of Object.entries(rolePolicy)) {
        if (neverTranslate.has(role) && decision.translatable) {
          violations.push(`${sectionKey} / ${role}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps the translatable surface small — ADR-003 counts ~9 prose field keys', () => {
    const translatableKeys = new Set<string>();
    for (const sectionType of sectionTypes) {
      for (const key of selectTranslatableFieldKeys(sectionType.key, seedFieldsFor(sectionType))) {
        translatableKeys.add(key);
      }
    }
    // A jump here means someone widened the policy; make it deliberate.
    expect([...translatableKeys].sort()).toEqual([
      'achievements',
      'description',
      'highlights',
      'name',
      'placement',
      'role',
      'text',
      'title',
    ]);
  });

  it('SEMANTIC_ROLE names exactly the roles the seed declares', () => {
    const seeded = new Set<string>();
    for (const sectionType of sectionTypes) {
      for (const field of seedFieldsFor(sectionType)) {
        if (field.semanticRole) seeded.add(field.semanticRole);
      }
    }
    const named = new Set<string>(Object.values(SEMANTIC_ROLE));

    const unnamed = [...seeded].filter((r) => !named.has(r)).sort();
    const stale = [...named].filter((r) => !seeded.has(r)).sort();

    expect(
      unnamed,
      `Roles in the seed with no SEMANTIC_ROLE symbol:\n${unnamed.join('\n')}`,
    ).toEqual([]);
    expect(stale, `SEMANTIC_ROLE symbols the seed dropped:\n${stale.join('\n')}`).toEqual([]);
  });

  it('leaves an unknown pair unclassified rather than guessing', () => {
    expect(lookupFieldTranslationDecision('not_a_section_v1', 'DESCRIPTION')).toBeNull();
    expect(isFieldTranslatable('not_a_section_v1', 'DESCRIPTION')).toBe(false);
    expect(isFieldTranslatable('work_experience_v1', undefined)).toBe(false);
  });
});
