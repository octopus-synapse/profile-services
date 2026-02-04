/**
 * Snapshot Service Tests
 *
 * Kent Beck: "Test the interface, not the implementation"
 * Tests for analytics snapshot persistence and retrieval
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { SnapshotService } from './snapshot.service';

describe('SnapshotService', () => {
  let service: SnapshotService;
  let mockPrisma: {
    resumeAnalytics: {
      create: ReturnType<typeof mock>;
      findMany: ReturnType<typeof mock>;
    };
  };

  const mockSnapshot = {
    id: 'snapshot-1',
    resumeId: 'resume-1',
    atsScore: 85,
    keywordScore: 80,
    completenessScore: 90,
    industryRank: 15,
    totalInIndustry: 100,
    topKeywords: ['javascript', 'react', 'nodejs'],
    missingKeywords: ['typescript', 'graphql'],
    createdAt: new Date('2026-02-01'),
  };

  beforeEach(() => {
    mockPrisma = {
      resumeAnalytics: {
        create: mock(() => Promise.resolve(mockSnapshot)),
        findMany: mock(() => Promise.resolve([mockSnapshot])),
      },
    };
    service = new SnapshotService(mockPrisma as never);
  });

  describe('save', () => {
    it('should save analytics snapshot with all fields', async () => {
      const input = {
        resumeId: 'resume-1',
        atsScore: 85,
        keywordScore: 80,
        completenessScore: 90,
        topKeywords: ['javascript', 'react'],
        missingKeywords: ['typescript'],
      };

      const result = await service.save(input);

      expect(mockPrisma.resumeAnalytics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resumeId: 'resume-1',
          atsScore: 85,
          keywordScore: 80,
          completenessScore: 90,
        }),
      });
      expect(result.resumeId).toBe('resume-1');
      expect(result.atsScore).toBe(85);
    });

    it('should use empty arrays for optional keywords', async () => {
      const input = {
        resumeId: 'resume-1',
        atsScore: 85,
        keywordScore: 80,
        completenessScore: 90,
      };

      await service.save(input);

      expect(mockPrisma.resumeAnalytics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          topKeywords: [],
          missingKeywords: [],
        }),
      });
    });

    it('should return mapped snapshot', async () => {
      const result = await service.save({
        resumeId: 'resume-1',
        atsScore: 85,
        keywordScore: 80,
        completenessScore: 90,
      });

      expect(result).toEqual({
        id: 'snapshot-1',
        resumeId: 'resume-1',
        atsScore: 85,
        keywordScore: 80,
        completenessScore: 90,
        industryRank: 15,
        totalInIndustry: 100,
        topKeywords: ['javascript', 'react', 'nodejs'],
        missingKeywords: ['typescript', 'graphql'],
        createdAt: expect.any(Date),
      });
    });
  });

  describe('getHistory', () => {
    it('should return snapshots ordered by date descending', async () => {
      const result = await service.getHistory('resume-1');

      expect(mockPrisma.resumeAnalytics.findMany).toHaveBeenCalledWith({
        where: { resumeId: 'resume-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      expect(result).toHaveLength(1);
    });

    it('should respect limit parameter', async () => {
      await service.getHistory('resume-1', 5);

      expect(mockPrisma.resumeAnalytics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it('should use default limit of 10', async () => {
      await service.getHistory('resume-1');

      expect(mockPrisma.resumeAnalytics.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('should return empty array when no history exists', async () => {
      mockPrisma.resumeAnalytics.findMany = mock(() => Promise.resolve([]));

      const result = await service.getHistory('resume-no-history');

      expect(result).toEqual([]);
    });
  });

  describe('getScoreProgression', () => {
    const progressionSnapshots = [
      { atsScore: 70, createdAt: new Date('2026-01-15') },
      { atsScore: 75, createdAt: new Date('2026-01-20') },
      { atsScore: 85, createdAt: new Date('2026-01-25') },
    ];

    beforeEach(() => {
      mockPrisma.resumeAnalytics.findMany = mock(() =>
        Promise.resolve(progressionSnapshots),
      );
    });

    it('should return score progression points', async () => {
      const result = await service.getScoreProgression('resume-1', 30);

      expect(result).toEqual([
        { date: '2026-01-15', score: 70 },
        { date: '2026-01-20', score: 75 },
        { date: '2026-01-25', score: 85 },
      ]);
    });

    it('should filter by date range', async () => {
      await service.getScoreProgression('resume-1', 30);

      expect(mockPrisma.resumeAnalytics.findMany).toHaveBeenCalledWith({
        where: {
          resumeId: 'resume-1',
          createdAt: { gte: expect.any(Date) },
        },
        orderBy: { createdAt: 'asc' },
        select: { atsScore: true, createdAt: true },
      });
    });

    it('should use default 30 days', async () => {
      await service.getScoreProgression('resume-1');

      const call = mockPrisma.resumeAnalytics.findMany.mock.calls[0][0];
      const startDate = call.where.createdAt.gte;
      const daysDiff = Math.round(
        (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBeGreaterThanOrEqual(29);
      expect(daysDiff).toBeLessThanOrEqual(31);
    });

    it('should return empty array when no progression data', async () => {
      mockPrisma.resumeAnalytics.findMany = mock(() => Promise.resolve([]));

      const result = await service.getScoreProgression('resume-1');

      expect(result).toEqual([]);
    });
  });
});
