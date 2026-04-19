/**
 * Dashboard Service Tests
 *
 * Pure tests using in-memory implementations (no mocks).
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { AtsScoringPort } from '../application/ports/facade.ports';
import type { ResumeForAnalytics } from '../domain/types';
import type { ATSScoreResult } from '../interfaces';
import { InMemorySnapshot, InMemoryViewTracking } from '../testing';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let viewTracking: InMemoryViewTracking;
  let snapshot: InMemorySnapshot;

  const mockAtsScoreResult: ATSScoreResult = {
    score: 85,
    sectionBreakdown: [
      { sectionKind: 'SKILLS', sectionTypeKey: 'skill_v1', score: 80 },
      { sectionKind: 'WORK_EXPERIENCE', sectionTypeKey: 'work_experience_v1', score: 90 },
    ],
    issues: [],
    recommendations: ['Add more keywords'],
  };

  const mockAtsScore: AtsScoringPort = {
    calculate: mock(async () => mockAtsScoreResult),
  };

  const mockResume: ResumeForAnalytics = {
    summary: 'Experienced developer',
    emailContact: 'test@example.com',
    phone: '+1234567890',
    sections: [
      {
        id: 'section-skills',
        semanticKind: 'SKILLS',
        items: [
          { id: '1', content: { name: 'JavaScript' } },
          { id: '2', content: { name: 'React' } },
        ],
      },
      {
        id: 'section-experience',
        semanticKind: 'WORK_EXPERIENCE',
        items: [
          {
            id: '3',
            content: {
              description: 'Developed web applications',
              startDate: '2020-01-01',
              endDate: '2023-01-01',
            },
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    viewTracking = new InMemoryViewTracking();
    snapshot = new InMemorySnapshot();

    service = new DashboardService(viewTracking, mockAtsScore, snapshot);

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

    it('should include ATS score', async () => {
      const result = await service.build('resume-1', mockResume);

      expect(result.overview.atsScore).toBe(85);
      expect(result.overview.keywordScore).toBe(85);
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

    it('should include recommendations', async () => {
      const result = await service.build('resume-1', mockResume);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].message).toBe('Add more keywords');
    });

    it('should include resumeId in result', async () => {
      const result = await service.build('resume-1', mockResume);

      expect(result.resumeId).toBe('resume-1');
    });
  });
});
