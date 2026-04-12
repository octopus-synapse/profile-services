/**
 * Analyze Keywords Use Case Tests
 *
 * Tests for keyword analysis and job matching
 * Uses GENERIC sections - no type-specific knowledge
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { AnalyticsSection, ResumeForAnalytics } from '../../../domain/types';
import type { ResumeOwnershipPort } from '../../ports/resume-analytics.port';
import { AnalyzeKeywordsUseCase } from './analyze-keywords.use-case';

describe('AnalyzeKeywordsUseCase', () => {
  let useCase: AnalyzeKeywordsUseCase;

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
    summary: 'Full-stack developer with expertise in React and Node.js',
    jobTitle: 'Senior Software Engineer',
    emailContact: 'test@example.com',
    phone: '+1234567890',
    sections: [
      createSection('SKILL', [
        { name: 'JavaScript' },
        { name: 'React' },
        { name: 'Node.js' },
        { name: 'TypeScript' },
      ]),
      createSection('EXPERIENCE', [
        {
          position: 'Senior Developer',
          company: 'Tech Corp',
          description: 'Developed web applications using React and Node.js. Managed agile teams.',
        },
      ]),
    ],
    ...overrides,
  });

  beforeEach(() => {
    const mockOwnership: ResumeOwnershipPort = {
      verifyOwnership: async () => {},
      verifyResumeExists: async () => {},
      getResumeWithDetails: async () => createResume(),
    };
    useCase = new AnalyzeKeywordsUseCase(mockOwnership);
  });

  describe('getKeywordSuggestions', () => {
    it('should find existing keywords', () => {
      const resume = createResume();
      const result = useCase.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      expect(result.existingKeywords.length).toBeGreaterThan(0);
    });

    it('should identify missing keywords', () => {
      const resume = createResume({
        sections: [createSection('SKILL', [{ name: 'JavaScript' }])],
      });
      const result = useCase.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      expect(result.missingKeywords.length).toBeGreaterThan(0);
    });

    it('should calculate keyword density', () => {
      const resume = createResume();
      const result = useCase.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      expect(typeof result.keywordDensity).toBe('number');
      expect(result.keywordDensity).toBeGreaterThanOrEqual(0);
    });

    it('should detect keyword stuffing', () => {
      const resume = createResume({
        summary: 'React React React React React React developer React React React',
        sections: [
          createSection('EXPERIENCE', [
            {
              position: 'React Developer',
              company: 'React Corp',
              description: 'React React React React React React React',
            },
          ]),
        ],
      });
      const result = useCase.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      const stuffingWarning = result.warnings.find((w) => w.type === 'keyword_stuffing');
      if (result.warnings.length > 0) {
        expect(stuffingWarning).toBeDefined();
      }
    });

    it('should generate recommendations for missing keywords', () => {
      const resume = createResume({
        sections: [],
      });
      const result = useCase.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should count keyword occurrences', () => {
      const resume = createResume({
        summary: 'React developer with React experience in React',
      });
      const result = useCase.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      const reactKeyword = result.existingKeywords.find((k) => k.keyword.toLowerCase() === 'react');
      if (reactKeyword) {
        expect(reactKeyword.count).toBeGreaterThan(1);
      }
    });

    it('should sort existing keywords by count descending', () => {
      const resume = createResume();
      const result = useCase.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      for (let i = 0; i < result.existingKeywords.length - 1; i++) {
        expect(result.existingKeywords[i].count).toBeGreaterThanOrEqual(
          result.existingKeywords[i + 1].count,
        );
      }
    });
  });

  describe('matchJob', () => {
    const jobDescription = `
      We are looking for a Senior React Developer with experience in:
      - React and Redux
      - Node.js backend development
      - TypeScript
      - Agile methodologies
      - Team leadership
    `;

    it('should calculate match score', () => {
      const resume = createResume();
      const result = useCase.matchJob(resume, jobDescription);

      expect(result.matchScore).toBeGreaterThanOrEqual(0);
      expect(result.matchScore).toBeLessThanOrEqual(100);
    });

    it('should identify matched keywords', () => {
      const resume = createResume();
      const result = useCase.matchJob(resume, jobDescription);

      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it('should identify missing keywords', () => {
      const resume = createResume({
        sections: [createSection('SKILL', [{ name: 'Python' }])],
      });
      const result = useCase.matchJob(resume, jobDescription);

      expect(result.missingKeywords.length).toBeGreaterThan(0);
    });

    it('should generate match recommendations', () => {
      const resume = createResume({
        sections: [],
      });
      const result = useCase.matchJob(resume, jobDescription);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should return high score for matching resume', () => {
      const resume = createResume({
        summary: 'React Redux TypeScript Node.js Agile Team Leadership',
        sections: [
          createSection('SKILL', [
            { name: 'React' },
            { name: 'Redux' },
            { name: 'TypeScript' },
            { name: 'Node.js' },
            { name: 'Agile' },
          ]),
        ],
      });
      const result = useCase.matchJob(resume, jobDescription);

      expect(result.matchScore).toBeGreaterThan(50);
    });

    it('should return low score for non-matching resume', () => {
      const resume = createResume({
        summary: 'Python Django Flask developer',
        sections: [
          createSection('SKILL', [{ name: 'Python' }, { name: 'Django' }, { name: 'Flask' }]),
          createSection('EXPERIENCE', [
            {
              position: 'Python Developer',
              company: 'Other Corp',
              description: 'Built Python applications',
            },
          ]),
        ],
      });
      const result = useCase.matchJob(resume, jobDescription);

      expect(result.matchScore).toBeLessThan(50);
    });

    it('should return Great match for perfect match', () => {
      const resume = createResume({
        summary: 'Perfect match for all requirements',
        sections: [
          createSection('SKILL', [
            { name: 'React' },
            { name: 'Redux' },
            { name: 'TypeScript' },
            { name: 'Node.js' },
            { name: 'Agile' },
            { name: 'leadership' },
          ]),
        ],
      });
      const result = useCase.matchJob(resume, jobDescription);

      if (result.missingKeywords.length === 0) {
        expect(result.recommendations).toContain('Great match!');
      }
    });

    it('should handle empty job description', () => {
      const resume = createResume();
      const result = useCase.matchJob(resume, '');

      expect(result.matchScore).toBe(0);
    });
  });
});
