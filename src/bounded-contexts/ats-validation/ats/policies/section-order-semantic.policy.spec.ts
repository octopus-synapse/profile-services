import { describe, expect, it } from 'bun:test';
import type {
  SemanticResumeSnapshot,
  SectionTypeAtsEntry,
} from '../interfaces';
import { SectionOrderSemanticPolicy } from './section-order-semantic.policy';

const defaultCatalog: SectionTypeAtsEntry[] = [
  {
    key: 'personal_info_v1',
    kind: 'PERSONAL_INFO',
    ats: {
      isMandatory: false,
      recommendedPosition: 0,
      scoring: { baseScore: 0, fieldWeights: {} },
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
];

describe('SectionOrderSemanticPolicy', () => {
  const policy = new SectionOrderSemanticPolicy();

  it('returns no issues for expected order', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-1',
      sectionTypeCatalog: defaultCatalog,
      items: [
        {
          sectionTypeKey: 'pi',
          sectionTypeVersion: 1,
          sectionKind: 'PERSONAL_INFO',
          values: [],
        },
        {
          sectionTypeKey: 'sum',
          sectionTypeVersion: 1,
          sectionKind: 'SUMMARY',
          values: [],
        },
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
      ],
    };

    const result = policy.validate(snapshot);

    expect(result.passed).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('flags experience after education', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-2',
      sectionTypeCatalog: defaultCatalog,
      items: [
        {
          sectionTypeKey: 'edu',
          sectionTypeVersion: 1,
          sectionKind: 'EDUCATION',
          values: [],
        },
        {
          sectionTypeKey: 'exp',
          sectionTypeVersion: 1,
          sectionKind: 'WORK_EXPERIENCE',
          values: [],
        },
      ],
    };

    const result = policy.validate(snapshot);

    expect(
      result.issues.some(
        (issue) => issue.code === 'WORK_EXPERIENCE_AFTER_EDUCATION',
      ),
    ).toBe(true);
  });

  it('flags summary too late', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-3',
      sectionTypeCatalog: defaultCatalog,
      items: [
        {
          sectionTypeKey: 'pi',
          sectionTypeVersion: 1,
          sectionKind: 'PERSONAL_INFO',
          values: [],
        },
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
          sectionTypeKey: 'sum',
          sectionTypeVersion: 1,
          sectionKind: 'SUMMARY',
          values: [],
        },
      ],
    };

    const result = policy.validate(snapshot);

    expect(
      result.issues.some((issue) => issue.code === 'SUMMARY_TOO_LATE_SEMANTIC'),
    ).toBe(true);
  });
});
