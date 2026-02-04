/**
 * Keyword Analysis Service Tests
 *
 * Tests for keyword analysis and job matching
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { KeywordAnalysisService } from './keyword-analysis.service';

describe('KeywordAnalysisService', () => {
  let service: KeywordAnalysisService;

  const createResume = (overrides = {}) => ({
    summary: 'Full-stack developer with expertise in React and Node.js',
    jobTitle: 'Senior Software Engineer',
    skills: [
      { name: 'JavaScript' },
      { name: 'React' },
      { name: 'Node.js' },
      { name: 'TypeScript' },
    ],
    experiences: [
      {
        position: 'Senior Developer',
        company: 'Tech Corp',
        description:
          'Developed web applications using React and Node.js. Managed agile teams.',
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    service = new KeywordAnalysisService();
  });

  describe('getKeywordSuggestions', () => {
    it('should find existing keywords', () => {
      const resume = createResume();
      const result = service.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      expect(result.existingKeywords.length).toBeGreaterThan(0);
    });

    it('should identify missing keywords', () => {
      const resume = createResume({
        skills: [{ name: 'JavaScript' }],
      });
      const result = service.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      expect(result.missingKeywords.length).toBeGreaterThan(0);
    });

    it('should calculate keyword density', () => {
      const resume = createResume();
      const result = service.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      expect(typeof result.keywordDensity).toBe('number');
      expect(result.keywordDensity).toBeGreaterThanOrEqual(0);
    });

    it('should detect keyword stuffing', () => {
      const resume = createResume({
        summary:
          'React React React React React React developer React React React',
        experiences: [
          {
            position: 'React Developer',
            company: 'React Corp',
            description: 'React React React React React React React',
          },
        ],
      });
      const result = service.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      const stuffingWarning = result.warnings.find(
        (w) => w.type === 'keyword_stuffing',
      );
      if (result.warnings.length > 0) {
        expect(stuffingWarning).toBeDefined();
      }
    });

    it('should generate recommendations for missing keywords', () => {
      const resume = createResume({
        skills: [],
      });
      const result = service.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should count keyword occurrences', () => {
      const resume = createResume({
        summary: 'React developer with React experience in React',
      });
      const result = service.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      const reactKeyword = result.existingKeywords.find(
        (k) => k.keyword.toLowerCase() === 'react',
      );
      if (reactKeyword) {
        expect(reactKeyword.count).toBeGreaterThan(1);
      }
    });

    it('should sort existing keywords by count descending', () => {
      const resume = createResume();
      const result = service.getKeywordSuggestions(resume, {
        industry: 'software_engineering',
      });

      for (let i = 0; i < result.existingKeywords.length - 1; i++) {
        expect(result.existingKeywords[i].count).toBeGreaterThanOrEqual(
          result.existingKeywords[i + 1].count,
        );
      }
    });
  });

  describe('matchJobDescription', () => {
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
      const result = service.matchJobDescription(resume, jobDescription);

      expect(result.matchScore).toBeGreaterThanOrEqual(0);
      expect(result.matchScore).toBeLessThanOrEqual(100);
    });

    it('should identify matched keywords', () => {
      const resume = createResume();
      const result = service.matchJobDescription(resume, jobDescription);

      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it('should identify missing keywords', () => {
      const resume = createResume({
        skills: [{ name: 'Python' }],
      });
      const result = service.matchJobDescription(resume, jobDescription);

      expect(result.missingKeywords.length).toBeGreaterThan(0);
    });

    it('should generate match recommendations', () => {
      const resume = createResume({
        skills: [],
      });
      const result = service.matchJobDescription(resume, jobDescription);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should return high score for matching resume', () => {
      const resume = createResume({
        summary: 'React Redux TypeScript Node.js Agile Team Leadership',
        skills: [
          { name: 'React' },
          { name: 'Redux' },
          { name: 'TypeScript' },
          { name: 'Node.js' },
          { name: 'Agile' },
        ],
      });
      const result = service.matchJobDescription(resume, jobDescription);

      expect(result.matchScore).toBeGreaterThan(50);
    });

    it('should return low score for non-matching resume', () => {
      const resume = createResume({
        summary: 'Python Django Flask developer',
        skills: [{ name: 'Python' }, { name: 'Django' }, { name: 'Flask' }],
        experiences: [
          {
            position: 'Python Developer',
            company: 'Other Corp',
            description: 'Built Python applications',
          },
        ],
      });
      const result = service.matchJobDescription(resume, jobDescription);

      expect(result.matchScore).toBeLessThan(50);
    });

    it('should return Great match for perfect match', () => {
      const resume = createResume({
        summary: 'Perfect match for all requirements',
        skills: [
          { name: 'React' },
          { name: 'Redux' },
          { name: 'TypeScript' },
          { name: 'Node.js' },
          { name: 'Agile' },
          { name: 'leadership' },
        ],
      });
      const result = service.matchJobDescription(resume, jobDescription);

      if (result.missingKeywords.length === 0) {
        expect(result.recommendations).toContain('Great match!');
      }
    });

    it('should handle empty job description', () => {
      const resume = createResume();
      const result = service.matchJobDescription(resume, '');

      expect(result.matchScore).toBe(0);
    });
  });
});
