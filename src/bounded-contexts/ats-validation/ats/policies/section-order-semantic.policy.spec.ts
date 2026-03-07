import { describe, expect, it } from 'bun:test';
import type { SectionTypeAtsEntry, SemanticResumeSnapshot } from '../interfaces';
import { SectionOrderSemanticPolicy } from './section-order-semantic.policy';

/**
 * Generic catalog - NO hardcoded semantic kind strings in tests.
 * Tests should work with ANY section types defined in catalog.
 */
const createCatalog = (
  entries: Array<{
    key: string;
    kind: string;
    position: number;
    isMandatory?: boolean;
  }>,
): SectionTypeAtsEntry[] =>
  entries.map(({ key, kind, position, isMandatory = false }) => ({
    key,
    kind,
    ats: {
      isMandatory,
      recommendedPosition: position,
      scoring: { baseScore: 50, fieldWeights: {} },
    },
  }));

const defaultCatalog = createCatalog([
  { key: 'header_v1', kind: 'HEADER', position: 0 },
  { key: 'summary_v1', kind: 'SUMMARY', position: 1 },
  { key: 'experience_v1', kind: 'EXPERIENCE', position: 2, isMandatory: true },
  { key: 'education_v1', kind: 'EDUCATION', position: 3, isMandatory: true },
  { key: 'skills_v1', kind: 'SKILLS', position: 4 },
]);

const createItem = (kind: string) => ({
  sectionTypeKey: `${kind.toLowerCase()}_key`,
  sectionTypeVersion: 1,
  sectionKind: kind,
  values: [],
});

describe('SectionOrderSemanticPolicy', () => {
  const policy = new SectionOrderSemanticPolicy();

  it('passes when sections follow recommended order from catalog', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-1',
      sectionTypeCatalog: defaultCatalog,
      items: [
        createItem('HEADER'),
        createItem('SUMMARY'),
        createItem('EXPERIENCE'),
        createItem('EDUCATION'),
      ],
    };

    const result = policy.validate(snapshot);

    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('flags sections that are out of recommended order based on catalog positions', () => {
    // EDUCATION (position 3) appears before EXPERIENCE (position 2)
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-2',
      sectionTypeCatalog: defaultCatalog,
      items: [
        createItem('HEADER'),
        createItem('EDUCATION'), // position 3 - should be after EXPERIENCE
        createItem('EXPERIENCE'), // position 2
      ],
    };

    const result = policy.validate(snapshot);

    expect(result.issues.some((i) => i.code === 'SECTION_ORDER_MISMATCH')).toBe(true);
  });

  it('flags early sections appearing too late based on catalog positions', () => {
    // SUMMARY (position 1) appears after multiple sections
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-3',
      sectionTypeCatalog: defaultCatalog,
      items: [
        createItem('HEADER'),
        createItem('EXPERIENCE'),
        createItem('EDUCATION'),
        createItem('SUMMARY'), // position 1, but appearing 4th
      ],
    };

    const result = policy.validate(snapshot);

    expect(result.issues.some((i) => i.code === 'SECTION_ORDER_MISMATCH')).toBe(true);
  });

  it('returns recommendedOrder from catalog in metadata', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-4',
      sectionTypeCatalog: defaultCatalog,
      items: [createItem('HEADER')],
    };

    const result = policy.validate(snapshot);

    expect(result.metadata?.recommendedOrder).toEqual([
      'HEADER',
      'SUMMARY',
      'EXPERIENCE',
      'EDUCATION',
      'SKILLS',
    ]);
  });

  it('works with custom section types not in standard catalog', () => {
    const customCatalog = createCatalog([
      { key: 'portfolio_v1', kind: 'PORTFOLIO', position: 0 },
      { key: 'testimonials_v1', kind: 'TESTIMONIALS', position: 1 },
      { key: 'my_custom_v1', kind: 'MY_CUSTOM_SECTION', position: 2 },
    ]);

    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-5',
      sectionTypeCatalog: customCatalog,
      items: [createItem('PORTFOLIO'), createItem('TESTIMONIALS'), createItem('MY_CUSTOM_SECTION')],
    };

    const result = policy.validate(snapshot);

    expect(result.passed).toBe(true);
    expect(result.metadata?.recommendedOrder).toEqual([
      'PORTFOLIO',
      'TESTIMONIALS',
      'MY_CUSTOM_SECTION',
    ]);
  });

  it('handles sections not in catalog gracefully', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-6',
      sectionTypeCatalog: defaultCatalog,
      items: [
        createItem('HEADER'),
        createItem('UNKNOWN_SECTION'), // Not in catalog
        createItem('SUMMARY'),
      ],
    };

    const result = policy.validate(snapshot);

    // Should not crash, unknown sections treated as low priority (end)
    expect(result.passed).toBe(true);
  });
});
