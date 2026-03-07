import { describe, expect, it } from 'bun:test';
import type { SectionTypeAtsEntry } from '../interfaces';
import { DefinitionDrivenScoringStrategy } from './definition-driven-scoring.strategy';
import { SemanticScoringService } from './semantic-scoring.service';

describe('SemanticScoringService', () => {
  const scorer = new DefinitionDrivenScoringStrategy();
  const service = new SemanticScoringService(scorer);

  const sectionTypeCatalog: SectionTypeAtsEntry[] = [
    {
      key: 'work_experience_v1',
      kind: 'WORK_EXPERIENCE',
      ats: {
        isMandatory: true,
        recommendedPosition: 2,
        scoring: {
          baseScore: 30,
          fieldWeights: {
            ORGANIZATION: 20,
            JOB_TITLE: 20,
            START_DATE: 15,
            END_DATE: 10,
            DESCRIPTION: 5,
          },
        },
      },
    },
    {
      key: 'education_v1',
      kind: 'EDUCATION',
      ats: {
        isMandatory: true,
        recommendedPosition: 3,
        scoring: {
          baseScore: 35,
          fieldWeights: {
            ORGANIZATION: 20,
            DEGREE: 25,
            START_DATE: 10,
            END_DATE: 10,
          },
        },
      },
    },
    {
      key: 'certification_v1',
      kind: 'CERTIFICATION',
      ats: {
        isMandatory: false,
        recommendedPosition: 5,
        scoring: {
          baseScore: 40,
          fieldWeights: { TITLE: 30, ORGANIZATION: 20, ISSUE_DATE: 10 },
        },
      },
    },
  ];

  it('scores semantic snapshot using definition-driven strategy', () => {
    const result = service.score({
      resumeId: 'resume-1',
      sectionTypeCatalog,
      items: [
        {
          sectionTypeKey: 'work_experience_v1',
          sectionTypeVersion: 1,
          sectionKind: 'WORK_EXPERIENCE',
          values: [
            { role: 'ORGANIZATION', value: 'ACME' },
            { role: 'JOB_TITLE', value: 'Engineer' },
            { role: 'START_DATE', value: '2020-01-01' },
            { role: 'END_DATE', value: '2021-12-01' },
            {
              role: 'DESCRIPTION',
              value: 'Built backend systems and improved reliability significantly.',
            },
          ],
        },
      ],
    });

    expect(result.breakdown.length).toBe(1);
    // baseScore(30) + ORGANIZATION(20) + JOB_TITLE(20) + START_DATE(15) + END_DATE(10) + DESCRIPTION(5) = 100
    expect(result.breakdown[0].score).toBe(100);
    expect(result.score).toBe(result.breakdown[0].score);
  });

  it('uses density-based fallback for unknown kinds', () => {
    const result = service.score({
      resumeId: 'resume-2',
      sectionTypeCatalog,
      items: [
        {
          sectionTypeKey: 'custom_v1',
          sectionTypeVersion: 1,
          sectionKind: 'CUSTOM',
          values: [{ role: 'CUSTOM', value: 'something' }],
        },
      ],
    });

    // Fallback: baseScore(30) + density(1.0) * 45 = 75
    expect(result.score).toBeGreaterThanOrEqual(35);
  });
});
