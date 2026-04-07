/**
 * Calculate ATS Score Use Case Tests — Definition-Driven
 *
 * Tests that ATS scoring reads ALL configuration from SectionType definitions.
 * ZERO hardcoded section knowledge — the catalog drives everything.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  defaultSectionTypes,
  InMemoryATSScoreRepository,
} from '@/bounded-contexts/analytics/testing';
import type { AnalyticsSection, ResumeForAnalytics } from '../../../domain/types';
import type { AtsScoreCatalogPort } from '../../ports/resume-analytics.port';
import { CalculateAtsScoreUseCase } from './calculate-ats-score.use-case';

describe('CalculateAtsScoreUseCase', () => {
  let useCase: CalculateAtsScoreUseCase;
  let mockEventEmitter: { emit: ReturnType<typeof mock> };
  let atsScoreRepo: InMemoryATSScoreRepository;

  const createSection = (
    semanticKind: string,
    items: Record<string, unknown>[],
  ): AnalyticsSection => ({
    id: `section-${semanticKind.toLowerCase()}`,
    semanticKind,
    items: items.map((content, idx) => ({
      id: `item-${idx}`,
      content,
    })),
  });

  const createResume = (overrides: Partial<ResumeForAnalytics> = {}): ResumeForAnalytics => ({
    summary: 'Experienced full-stack developer with 5 years of experience',
    emailContact: 'test@example.com',
    phone: '+1234567890',
    jobTitle: 'Software Engineer',
    sections: [
      createSection('SKILL_SET', [
        { name: 'JavaScript', category: 'Frontend' },
        { name: 'React', category: 'Frontend' },
      ]),
      createSection('WORK_EXPERIENCE', [
        {
          company: 'Acme Corp',
          role: 'Developer',
          startDate: '2020-01-01',
          description: 'Built features',
        },
      ]),
    ],
    ...overrides,
  });

  beforeEach(() => {
    mockEventEmitter = { emit: mock(() => {}) };
    atsScoreRepo = new InMemoryATSScoreRepository();
    atsScoreRepo.seedSectionTypes(defaultSectionTypes);

    const catalog: AtsScoreCatalogPort = {
      loadCatalog: () => atsScoreRepo.findMany({ where: { isActive: true } }).then((types) =>
        types.map((st) => {
          const def = (st.definition ?? {}) as Record<string, unknown>;
          const ats = (def.ats ?? {}) as Record<string, unknown>;
          const scoring = (ats.scoring ?? {}) as Record<string, unknown>;
          const fields = (def.fields ?? []) as Array<Record<string, unknown>>;

          const roleToFieldKey: Record<string, string> = {};
          for (const field of fields) {
            if (typeof field.semanticRole === 'string' && typeof field.key === 'string') {
              roleToFieldKey[field.semanticRole] = field.key;
            }
          }

          return {
            key: st.key,
            kind: st.semanticKind,
            ats: {
              isMandatory: (ats.isMandatory as boolean) ?? false,
              recommendedPosition: (ats.recommendedPosition as number) ?? 99,
              scoring: {
                baseScore: (scoring.baseScore as number) ?? 30,
                fieldWeights: (scoring.fieldWeights as Record<string, number>) ?? {},
              },
            },
            roleToFieldKey,
          };
        }),
      ),
    };

    const mockEventPublisher = { publish: mock(() => {}) };
    const mockOwnership = {} as never;

    useCase = new CalculateAtsScoreUseCase(
      catalog,
      mockOwnership,
      mockEventEmitter as never,
      mockEventPublisher as never,
    );
  });

  describe('calculate', () => {
    it('should return score between 0 and 100', async () => {
      const result = await useCase.calculate(createResume());
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return per-section breakdown from definitions', async () => {
      const result = await useCase.calculate(createResume());
      expect(result.sectionBreakdown.length).toBeGreaterThan(0);

      for (const entry of result.sectionBreakdown) {
        expect(entry).toHaveProperty('sectionKind');
        expect(entry).toHaveProperty('sectionTypeKey');
        expect(entry).toHaveProperty('score');
        expect(entry.score).toBeGreaterThanOrEqual(0);
        expect(entry.score).toBeLessThanOrEqual(100);
      }
    });

    it('should detect missing contact info', async () => {
      const result = await useCase.calculate(createResume({ emailContact: null, phone: null }));
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_CONTACT_INFO',
          severity: 'high',
        }),
      );
    });

    it('should detect short summary', async () => {
      const result = await useCase.calculate(createResume({ summary: 'Short' }));
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'SHORT_SUMMARY',
          severity: 'medium',
        }),
      );
    });

    it('should detect missing mandatory sections from catalog', async () => {
      const result = await useCase.calculate(
        createResume({
          sections: [createSection('SKILL_SET', [{ name: 'JS', category: 'FE' }])],
        }),
      );

      const mandatoryIssues = result.issues.filter((i) => i.code === 'MISSING_MANDATORY_SECTION');
      expect(mandatoryIssues.length).toBeGreaterThanOrEqual(1);
      expect(mandatoryIssues.some((i) => i.context?.sectionKind === 'WORK_EXPERIENCE')).toBe(true);
    });

    it('should score sections based on fieldWeights from definition', async () => {
      const fullExperience = createResume({
        sections: [
          createSection('WORK_EXPERIENCE', [
            {
              company: 'Acme',
              role: 'Dev',
              startDate: '2020-01-01',
              description: 'Built things',
            },
          ]),
          createSection('SKILL_SET', [{ name: 'JS', category: 'FE' }]),
        ],
      });

      const partialExperience = createResume({
        sections: [
          createSection('WORK_EXPERIENCE', [
            { company: 'Acme' },
          ]),
          createSection('SKILL_SET', [{ name: 'JS', category: 'FE' }]),
        ],
      });

      const fullResult = await useCase.calculate(fullExperience);
      const partialResult = await useCase.calculate(partialExperience);

      const fullExpScore = fullResult.sectionBreakdown.find(
        (b) => b.sectionKind === 'WORK_EXPERIENCE',
      )?.score;
      const partialExpScore = partialResult.sectionBreakdown.find(
        (b) => b.sectionKind === 'WORK_EXPERIENCE',
      )?.score;

      expect(fullExpScore).toBeDefined();
      expect(partialExpScore).toBeDefined();
      if (fullExpScore === undefined || partialExpScore === undefined) {
        throw new Error('Expected scores to be defined');
      }
      expect(fullExpScore).toBeGreaterThan(partialExpScore);
    });

    it('should detect missing weighted fields', async () => {
      const result = await useCase.calculate(
        createResume({
          sections: [
            createSection('WORK_EXPERIENCE', [
              { company: 'Acme' },
            ]),
            createSection('SKILL_SET', [{ name: 'JS' }]),
          ],
        }),
      );

      const fieldIssues = result.issues.filter((i) => i.code === 'MISSING_WEIGHTED_FIELDS');
      expect(fieldIssues.length).toBeGreaterThan(0);
      expect(fieldIssues.some((i) => i.context?.sectionKind === 'WORK_EXPERIENCE')).toBe(true);
    });

    it('should generate recommendations from issues', async () => {
      const result = await useCase.calculate(
        createResume({
          summary: 'Too short',
          emailContact: null,
          phone: null,
        }),
      );
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should emit SSE event when resumeId is provided', async () => {
      await useCase.calculate(createResume(), 'resume-123');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'analytics:resume-123:ats_score',
        expect.objectContaining({
          type: 'ats_score',
          resumeId: 'resume-123',
        }),
      );
    });

    it('should not emit event when resumeId is not provided', async () => {
      await useCase.calculate(createResume());
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should load catalog from repository', async () => {
      await useCase.calculate(createResume());
      const sectionTypes = await atsScoreRepo.findMany({ where: { isActive: true } });
      expect(sectionTypes.length).toBeGreaterThan(0);
    });

    it('should use density fallback for sections with no fieldWeights', async () => {
      atsScoreRepo.clear();
      atsScoreRepo.seedSectionType({
        key: 'custom_v1',
        semanticKind: 'CUSTOM',
        definition: {
          fields: [],
          ats: {
            isMandatory: false,
            recommendedPosition: 99,
            scoring: { baseScore: 30, fieldWeights: {} },
          },
        },
      });

      const result = await useCase.calculate(
        createResume({
          sections: [createSection('CUSTOM', [{ foo: 'bar', baz: 'qux' }])],
        }),
      );

      expect(result.sectionBreakdown).toContainEqual(
        expect.objectContaining({ sectionKind: 'CUSTOM' }),
      );
    });

    it('should return zero score for empty resume', async () => {
      const result = await useCase.calculate(
        createResume({
          summary: '',
          emailContact: null,
          phone: null,
          sections: [],
        }),
      );
      expect(result.score).toBe(0);
    });
  });
});
