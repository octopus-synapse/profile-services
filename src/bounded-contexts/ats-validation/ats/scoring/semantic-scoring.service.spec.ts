import { describe, expect, it } from 'bun:test';
import {
  DateRangeExtractor,
  JobTitleExtractor,
  OrganizationExtractor,
} from '../extractors';
import { CertificationScoringStrategy } from './certification-scoring.strategy';
import { DefaultScoringStrategy } from './default-scoring.strategy';
import { EducationScoringStrategy } from './education-scoring.strategy';
import { SemanticScoringService } from './semantic-scoring.service';
import { WorkExperienceScoringStrategy } from './work-experience-scoring.strategy';

describe('SemanticScoringService', () => {
  const organizationExtractor = new OrganizationExtractor();
  const jobTitleExtractor = new JobTitleExtractor();
  const dateRangeExtractor = new DateRangeExtractor();

  const service = new SemanticScoringService(
    new WorkExperienceScoringStrategy(
      organizationExtractor,
      jobTitleExtractor,
      dateRangeExtractor,
    ),
    new EducationScoringStrategy(organizationExtractor, dateRangeExtractor),
    new CertificationScoringStrategy(organizationExtractor),
    new DefaultScoringStrategy(),
  );

  it('scores semantic snapshot using strategies by section kind', () => {
    const result = service.score({
      resumeId: 'resume-1',
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
              value:
                'Built backend systems and improved reliability significantly.',
            },
          ],
        },
      ],
    });

    expect(result.breakdown.length).toBe(1);
    expect(result.breakdown[0].score).toBeGreaterThanOrEqual(80);
    expect(result.score).toBe(result.breakdown[0].score);
  });

  it('uses default strategy for custom kinds', () => {
    const result = service.score({
      resumeId: 'resume-2',
      items: [
        {
          sectionTypeKey: 'custom_v1',
          sectionTypeVersion: 1,
          sectionKind: 'CUSTOM',
          values: [{ role: 'CUSTOM', value: 'something' }],
        },
      ],
    });

    expect(result.score).toBeGreaterThanOrEqual(35);
  });
});
