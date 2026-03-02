import { describe, expect, it } from 'bun:test';
import type { SemanticResumeSnapshot } from '../interfaces';
import { DuplicateSemanticPolicy } from './duplicate-semantic.policy';

describe('DuplicateSemanticPolicy', () => {
  const policy = new DuplicateSemanticPolicy();

  it('reports duplicate section type keys', () => {
    const snapshot: SemanticResumeSnapshot = {
      resumeId: 'resume-1',
      items: [
        {
          sectionTypeKey: 'project_v1',
          sectionTypeVersion: 1,
          sectionKind: 'PROJECT',
          values: [],
        },
        {
          sectionTypeKey: 'project_v1',
          sectionTypeVersion: 1,
          sectionKind: 'PROJECT',
          values: [],
        },
      ],
    };

    const result = policy.validate(snapshot);

    expect(
      result.issues.some(
        (issue) => issue.code === 'DUPLICATE_SEMANTIC_SECTION_TYPE',
      ),
    ).toBe(true);
  });
});
