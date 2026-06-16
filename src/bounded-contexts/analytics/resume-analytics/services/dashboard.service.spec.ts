/**
 * Dashboard Service Tests
 *
 * Pure tests using in-memory implementations (no mocks).
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { ResumeForAnalytics } from '../domain/types';
import { InMemorySnapshot, InMemoryViewTracking } from '../testing';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let viewTracking: InMemoryViewTracking;
  let snapshot: InMemorySnapshot;

  const mockResume: ResumeForAnalytics = {
    summary: 'Experienced developer',
    phone: '+1234567890',
    jobTitle: 'Engineer',
    sections: [],
  };

  beforeEach(() => {
    viewTracking = new InMemoryViewTracking();
    snapshot = new InMemorySnapshot();

    service = new DashboardService(viewTracking, snapshot);

    // Seed default data
    viewTracking.seedViewStats('resume-1', {
      totalViews: 150,
      uniqueVisitors: 100,
      viewsByDay: [],
      topSources: [
        { source: 'linkedin', count: 50, percentage: 33 },
        { source: 'direct', count: 100, percentage: 67 },
      ],
    });

    // The dashboard surfaces the latest persisted Resume Quality score.
    snapshot.seedLatest('resume-1', { overallScore: 85, completenessScore: 85 });

    snapshot.seedProgression('resume-1', [
      { date: '2026-01-01', score: 70 },
      { date: '2026-01-15', score: 80 },
      { date: '2026-02-01', score: 85 },
    ]);
  });

  describe('build', () => {
    it('should aggregate view stats', async () => {
      const result = await service.build('resume-1', mockResume);

      expect(result.overview.totalViews).toBe(150);
      expect(result.overview.uniqueVisitors).toBe(100);
    });

    it('should surface the latest resume quality score', async () => {
      const result = await service.build('resume-1', mockResume);

      expect(result.overview.atsScore).toBe(85);
      expect(result.overview.keywordScore).toBe(85);
    });

    it('should default scores to zero when no quality score exists', async () => {
      const result = await service.build('resume-unknown', mockResume);

      expect(result.overview.atsScore).toBe(0);
      expect(result.overview.keywordScore).toBe(0);
    });

    it('should calculate improving trend', async () => {
      const result = await service.build('resume-1', mockResume);

      // Score went from 70 to 85, diff > 5
      expect(result.industryPosition.trend).toBe('improving');
    });

    it('should calculate declining trend', async () => {
      snapshot.seedProgression('resume-1', [
        { date: '2026-01-01', score: 90 },
        { date: '2026-02-01', score: 70 },
      ]);

      const result = await service.build('resume-1', mockResume);

      expect(result.industryPosition.trend).toBe('declining');
    });

    it('should calculate stable trend', async () => {
      snapshot.seedProgression('resume-1', [
        { date: '2026-01-01', score: 80 },
        { date: '2026-02-01', score: 82 },
      ]);

      const result = await service.build('resume-1', mockResume);

      expect(result.industryPosition.trend).toBe('stable');
    });

    it('should return stable for single data point', async () => {
      snapshot.seedProgression('resume-1', [{ date: '2026-01-01', score: 80 }]);

      const result = await service.build('resume-1', mockResume);

      expect(result.industryPosition.trend).toBe('stable');
    });

    it('should include resumeId in result', async () => {
      const result = await service.build('resume-1', mockResume);

      expect(result.resumeId).toBe('resume-1');
    });
  });
});
