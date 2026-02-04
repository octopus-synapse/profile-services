/**
 * ATS Score Service Tests
 *
 * Tests for ATS (Applicant Tracking System) score calculation
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ATSScoreService } from './ats-score.service';

describe('ATSScoreService', () => {
  let service: ATSScoreService;
  let mockEventEmitter: {
    emit: ReturnType<typeof mock>;
  };

  const createResume = (overrides = {}) => ({
    id: 'resume-1',
    skills: [{ name: 'JavaScript' }, { name: 'React' }, { name: 'Node.js' }],
    experiences: [
      {
        description: 'Developed and managed web applications using React',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2023-01-01'),
      },
    ],
    summary: 'Experienced full-stack developer with 5 years of experience',
    emailContact: 'test@example.com',
    phone: '+1234567890',
    ...overrides,
  });

  beforeEach(() => {
    mockEventEmitter = {
      emit: mock(() => {}),
    };
    service = new ATSScoreService(mockEventEmitter as never);
  });

  describe('calculate', () => {
    it('should return score between 0 and 100', () => {
      const resume = createResume();
      const result = service.calculate(resume);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should include breakdown with all categories', () => {
      const resume = createResume();
      const result = service.calculate(resume);

      expect(result.breakdown).toHaveProperty('keywords');
      expect(result.breakdown).toHaveProperty('format');
      expect(result.breakdown).toHaveProperty('completeness');
      expect(result.breakdown).toHaveProperty('experience');
    });

    it('should detect missing contact info', () => {
      const resume = createResume({
        emailContact: null,
        phone: null,
      });
      const result = service.calculate(resume);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'missing_contact',
          severity: 'high',
        }),
      );
    });

    it('should detect short summary', () => {
      const resume = createResume({
        summary: 'Short',
      });
      const result = service.calculate(resume);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'short_summary',
          severity: 'medium',
        }),
      );
    });

    it('should reward more skills with higher keyword score', () => {
      const fewSkills = createResume({
        skills: [{ name: 'JavaScript' }],
      });
      const manySkills = createResume({
        skills: Array(10)
          .fill(null)
          .map((_, i) => ({ name: `Skill${i}` })),
      });

      const fewResult = service.calculate(fewSkills);
      const manyResult = service.calculate(manySkills);

      expect(manyResult.breakdown.keywords).toBeGreaterThan(
        fewResult.breakdown.keywords,
      );
    });

    it('should generate recommendations for issues', () => {
      const resume = createResume({
        summary: 'Too short',
        emailContact: null,
        phone: null,
      });
      const result = service.calculate(resume);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should emit SSE event when resumeId is provided', () => {
      const resume = createResume();
      service.calculate(resume, 'resume-123');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'analytics:resume-123:ats_score',
        expect.objectContaining({
          type: 'ats_score',
          resumeId: 'resume-123',
        }),
      );
    });

    it('should not emit event when resumeId is not provided', () => {
      const resume = createResume();
      service.calculate(resume);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should detect weak action verbs', () => {
      const resume = createResume({
        experiences: [
          {
            description: 'Was responsible for things',
            startDate: new Date('2020-01-01'),
            endDate: new Date('2023-01-01'),
          },
        ],
      });
      const result = service.calculate(resume);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'weak_action_verbs',
        }),
      );
    });

    it('should give higher format score with action verbs', () => {
      const weakVerbs = createResume({
        experiences: [
          {
            description: 'Was doing stuff',
            startDate: new Date('2020-01-01'),
            endDate: null,
          },
        ],
      });
      const strongVerbs = createResume({
        experiences: [
          {
            description:
              'Developed, managed, and implemented solutions. Led team to success.',
            startDate: new Date('2020-01-01'),
            endDate: null,
          },
        ],
      });

      const weakResult = service.calculate(weakVerbs);
      const strongResult = service.calculate(strongVerbs);

      expect(strongResult.breakdown.format).toBeGreaterThan(
        weakResult.breakdown.format,
      );
    });

    it('should cap keyword score at maximum', () => {
      const resume = createResume({
        skills: Array(50)
          .fill(null)
          .map((_, i) => ({ name: `Skill${i}` })),
      });
      const result = service.calculate(resume);

      expect(result.breakdown.keywords).toBeLessThanOrEqual(100);
    });
  });
});
