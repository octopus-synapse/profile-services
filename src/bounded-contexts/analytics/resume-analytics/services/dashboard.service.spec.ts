/**
 * Dashboard Service Tests
 *
 * Tests for analytics dashboard aggregation
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockViewTracking: {
    getViewStats: ReturnType<typeof mock>;
  };
  let mockAtsScore: {
    calculate: ReturnType<typeof mock>;
  };
  let mockSnapshot: {
    getScoreProgression: ReturnType<typeof mock>;
  };

  const mockResume = {
    id: 'resume-1',
    skills: [{ name: 'JavaScript' }, { name: 'React' }],
    experiences: [
      {
        description: 'Developed web applications',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2023-01-01'),
      },
    ],
    summary: 'Experienced developer',
    emailContact: 'test@example.com',
    phone: '+1234567890',
  };

  beforeEach(() => {
    mockViewTracking = {
      getViewStats: mock(() =>
        Promise.resolve({
          totalViews: 150,
          uniqueVisitors: 100,
          viewsByDay: [],
          topSources: ['linkedin', 'direct'],
        }),
      ),
    };

    mockAtsScore = {
      calculate: mock(() => ({
        score: 85,
        breakdown: {
          keywords: 80,
          format: 90,
          completeness: 85,
          experience: 85,
        },
        issues: [],
        recommendations: ['Add more keywords'],
      })),
    };

    mockSnapshot = {
      getScoreProgression: mock(() =>
        Promise.resolve([
          { date: '2026-01-01', score: 70 },
          { date: '2026-01-15', score: 80 },
          { date: '2026-02-01', score: 85 },
        ]),
      ),
    };

    service = new DashboardService(
      mockViewTracking as never,
      mockAtsScore as never,
      mockSnapshot as never,
    );
  });

  describe('build', () => {
    it('should aggregate view stats', async () => {
      const result = await service.build('resume-1', mockResume);

      expect(result.overview.totalViews).toBe(150);
      expect(result.overview.uniqueVisitors).toBe(100);
    });

    it('should include ATS score', async () => {
      const result = await service.build('resume-1', mockResume);

      expect(result.overview.atsScore).toBe(85);
      expect(result.overview.keywordScore).toBe(80);
    });

    it('should calculate improving trend', async () => {
      const result = await service.build('resume-1', mockResume);

      // Score went from 70 to 85, diff > 5
      expect(result.industryPosition.trend).toBe('improving');
    });

    it('should calculate declining trend', async () => {
      mockSnapshot.getScoreProgression = mock(() =>
        Promise.resolve([
          { date: '2026-01-01', score: 90 },
          { date: '2026-02-01', score: 70 },
        ]),
      );

      const result = await service.build('resume-1', mockResume);

      expect(result.industryPosition.trend).toBe('declining');
    });

    it('should calculate stable trend', async () => {
      mockSnapshot.getScoreProgression = mock(() =>
        Promise.resolve([
          { date: '2026-01-01', score: 80 },
          { date: '2026-02-01', score: 82 },
        ]),
      );

      const result = await service.build('resume-1', mockResume);

      expect(result.industryPosition.trend).toBe('stable');
    });

    it('should return stable for single data point', async () => {
      mockSnapshot.getScoreProgression = mock(() =>
        Promise.resolve([{ date: '2026-01-01', score: 80 }]),
      );

      const result = await service.build('resume-1', mockResume);

      expect(result.industryPosition.trend).toBe('stable');
    });

    it('should include recommendations', async () => {
      const result = await service.build('resume-1', mockResume);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].message).toBe('Add more keywords');
    });

    it('should include resumeId in result', async () => {
      const result = await service.build('resume-1', mockResume);

      expect(result.resumeId).toBe('resume-1');
    });

    it('should fetch view stats for month period', async () => {
      await service.build('resume-1', mockResume);

      expect(mockViewTracking.getViewStats).toHaveBeenCalledWith('resume-1', {
        period: 'month',
      });
    });

    it('should fetch 30-day progression', async () => {
      await service.build('resume-1', mockResume);

      expect(mockSnapshot.getScoreProgression).toHaveBeenCalledWith(
        'resume-1',
        30,
      );
    });
  });
});
