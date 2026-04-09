import { describe, expect, it } from 'bun:test';
import { AtsScore } from './ats-score';
import type { AtsScoreBreakdown } from './ats-score';

describe('AtsScore', () => {
  describe('construction', () => {
    it('should create an AtsScore with valid values', () => {
      const breakdown: AtsScoreBreakdown[] = [
        { criterion: 'layout', score: 90, weight: 0.5 },
      ];
      const score = new AtsScore(90, breakdown, ['Fix contrast']);

      expect(score.overall).toBe(90);
      expect(score.breakdown).toEqual(breakdown);
      expect(score.recommendations).toEqual(['Fix contrast']);
    });

    it('should accept score of 0', () => {
      const score = new AtsScore(0, [], []);

      expect(score.overall).toBe(0);
    });

    it('should accept score of 100', () => {
      const score = new AtsScore(100, [], []);

      expect(score.overall).toBe(100);
    });

    it('should throw when score is below 0', () => {
      expect(() => new AtsScore(-1, [], [])).toThrow('ATS score must be 0-100');
    });

    it('should throw when score is above 100', () => {
      expect(() => new AtsScore(101, [], [])).toThrow('ATS score must be 0-100');
    });
  });

  describe('isFriendly', () => {
    it('should return true when score is 80', () => {
      const score = new AtsScore(80, [], []);

      expect(score.isFriendly()).toBe(true);
    });

    it('should return true when score is above 80', () => {
      const score = new AtsScore(95, [], []);

      expect(score.isFriendly()).toBe(true);
    });

    it('should return false when score is below 80', () => {
      const score = new AtsScore(79, [], []);

      expect(score.isFriendly()).toBe(false);
    });
  });

  describe('fromBreakdown', () => {
    it('should calculate weighted overall score', () => {
      const breakdown: AtsScoreBreakdown[] = [
        { criterion: 'layout', score: 100, weight: 0.5 },
        { criterion: 'typography', score: 60, weight: 0.5 },
      ];

      const score = AtsScore.fromBreakdown(breakdown);

      expect(score.overall).toBe(80);
    });

    it('should handle different weights correctly', () => {
      const breakdown: AtsScoreBreakdown[] = [
        { criterion: 'layout', score: 100, weight: 0.7 },
        { criterion: 'typography', score: 50, weight: 0.3 },
      ];

      const score = AtsScore.fromBreakdown(breakdown);

      expect(score.overall).toBe(85);
    });

    it('should return 0 when breakdown is empty', () => {
      const score = AtsScore.fromBreakdown([]);

      expect(score.overall).toBe(0);
      expect(score.breakdown).toEqual([]);
      expect(score.recommendations).toEqual([]);
    });

    it('should collect recommendations only from items scoring below 80', () => {
      const breakdown: AtsScoreBreakdown[] = [
        { criterion: 'layout', score: 90, weight: 0.5, recommendation: 'Looks good' },
        { criterion: 'typography', score: 60, weight: 0.3, recommendation: 'Increase font size' },
        { criterion: 'contrast', score: 40, weight: 0.2, recommendation: 'Improve contrast' },
      ];

      const score = AtsScore.fromBreakdown(breakdown);

      expect(score.recommendations).toEqual(['Increase font size', 'Improve contrast']);
    });

    it('should exclude items without recommendations even if score is low', () => {
      const breakdown: AtsScoreBreakdown[] = [
        { criterion: 'layout', score: 50, weight: 1.0 },
      ];

      const score = AtsScore.fromBreakdown(breakdown);

      expect(score.recommendations).toEqual([]);
    });

    it('should round the overall score', () => {
      const breakdown: AtsScoreBreakdown[] = [
        { criterion: 'a', score: 33, weight: 0.33 },
        { criterion: 'b', score: 67, weight: 0.67 },
      ];

      const score = AtsScore.fromBreakdown(breakdown);

      expect(score.overall).toBe(Math.round((33 * 0.33 + 67 * 0.67) / (0.33 + 0.67)));
    });
  });
});
