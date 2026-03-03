import { describe, expect, it } from 'bun:test';
import type { SemanticResumeSnapshot } from '../interfaces';
import { ContentQualitySemanticPolicy } from './content-quality-semantic.policy';

describe('ContentQualitySemanticPolicy', () => {
  const policy = new ContentQualitySemanticPolicy();

  it('warns when required roles are missing', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-1',
      sectionTypeCatalog: [],
      items: [
        {
          sectionTypeKey: 'work_experience_v1',
          sectionTypeVersion: 1,
          sectionKind: 'WORK_EXPERIENCE',
          values: [{ role: 'DESCRIPTION', value: 'short text' }],
        },
      ],
    };

    const result = policy.validate(snapshot);

    expect(
      result.issues.some(
        (issue) => issue.code === 'MISSING_REQUIRED_SEMANTIC_ROLES',
      ),
    ).toBe(true);
  });

  it('flags short description', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-2',
      sectionTypeCatalog: [],
      items: [
        {
          sectionTypeKey: 'work_experience_v1',
          sectionTypeVersion: 1,
          sectionKind: 'WORK_EXPERIENCE',
          values: [
            { role: 'ORGANIZATION', value: 'ACME' },
            { role: 'JOB_TITLE', value: 'Engineer' },
            { role: 'DESCRIPTION', value: 'Too short' },
          ],
        },
      ],
    };

    const result = policy.validate(snapshot);

    expect(
      result.issues.some((issue) => issue.code === 'DESCRIPTION_TOO_SHORT'),
    ).toBe(true);
  });
});
