import { describe, expect, it } from 'bun:test';
import type { SectionTypeAtsEntry, SemanticResumeSnapshot } from '../interfaces';
import { MandatorySemanticPolicy } from './mandatory-semantic.policy';

const defaultCatalog: SectionTypeAtsEntry[] = [
  {
    key: 'work_experience_v1',
    kind: 'WORK_EXPERIENCE',
    ats: {
      isMandatory: true,
      recommendedPosition: 2,
      scoring: { baseScore: 30, fieldWeights: {} },
    },
  },
  {
    key: 'education_v1',
    kind: 'EDUCATION',
    ats: {
      isMandatory: true,
      recommendedPosition: 3,
      scoring: { baseScore: 35, fieldWeights: {} },
    },
  },
  {
    key: 'skill_set_v1',
    kind: 'SKILL_SET',
    ats: {
      isMandatory: true,
      recommendedPosition: 4,
      scoring: { baseScore: 40, fieldWeights: {} },
    },
  },
  {
    key: 'summary_v1',
    kind: 'SUMMARY',
    ats: {
      isMandatory: false,
      recommendedPosition: 1,
      scoring: { baseScore: 50, fieldWeights: {} },
    },
  },
];

describe('MandatorySemanticPolicy', () => {
  const policy = new MandatorySemanticPolicy();

  it('passes when mandatory kinds are present', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-1',
      sectionTypeCatalog: defaultCatalog,
      items: [
        {
          sectionTypeKey: 'exp',
          sectionTypeVersion: 1,
          sectionKind: 'WORK_EXPERIENCE',
          values: [],
        },
        {
          sectionTypeKey: 'edu',
          sectionTypeVersion: 1,
          sectionKind: 'EDUCATION',
          values: [],
        },
        {
          sectionTypeKey: 'skills',
          sectionTypeVersion: 1,
          sectionKind: 'SKILL_SET',
          values: [],
        },
      ],
    };

    const result = policy.validate(snapshot);

    expect(result.passed).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('warns when mandatory kinds are missing', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-2',
      sectionTypeCatalog: defaultCatalog,
      items: [
        {
          sectionTypeKey: 'sum',
          sectionTypeVersion: 1,
          sectionKind: 'SUMMARY',
          values: [],
        },
      ],
    };

    const result = policy.validate(snapshot);

    expect(result.passed).toBe(true);
    expect(result.issues.some((issue) => issue.code === 'MISSING_MANDATORY_SEMANTIC_KINDS')).toBe(
      true,
    );
  });

  it('fails when snapshot has no items', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-3',
      sectionTypeCatalog: defaultCatalog,
      items: [],
    };

    const result = policy.validate(snapshot);

    expect(result.passed).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'NO_SEMANTIC_ITEMS_DETECTED')).toBe(true);
  });
});
