import { describe, expect, it } from 'bun:test';
import type { SemanticResumeSnapshot } from '../interfaces';
import { MandatorySemanticPolicy } from './mandatory-semantic.policy';

describe('MandatorySemanticPolicy', () => {
  const policy = new MandatorySemanticPolicy();

  it('passes when mandatory kinds are present', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-1',
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
    expect(
      result.issues.some(
        (issue) => issue.code === 'MISSING_MANDATORY_SEMANTIC_KINDS',
      ),
    ).toBe(true);
  });

  it('fails when snapshot has no items', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-3',
      items: [],
    };

    const result = policy.validate(snapshot);

    expect(result.passed).toBe(false);
    expect(
      result.issues.some(
        (issue) => issue.code === 'NO_SEMANTIC_ITEMS_DETECTED',
      ),
    ).toBe(true);
  });
});
