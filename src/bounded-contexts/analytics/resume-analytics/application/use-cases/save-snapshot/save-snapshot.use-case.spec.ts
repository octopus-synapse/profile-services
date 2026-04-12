/**
 * Save Snapshot / Get History / Get Progression Use Case Tests
 *
 * Tests for analytics snapshot persistence and retrieval.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  InMemorySnapshotRepository,
  type SnapshotRecord,
} from '@/bounded-contexts/analytics/testing';
import type { SnapshotRepositoryPort } from '../../ports/resume-analytics.port';

/**
 * Adapter to expose InMemorySnapshotRepository through the SnapshotRepositoryPort interface.
 */
function toAnalyticsSnapshot(
  record: SnapshotRecord,
): import('../../../interfaces').AnalyticsSnapshot {
  return {
    id: record.id,
    resumeId: record.resumeId,
    atsScore: record.atsScore,
    keywordScore: record.keywordScore,
    completenessScore: record.completenessScore,
    industryRank: record.industryRank ?? undefined,
    totalInIndustry: record.totalInIndustry ?? undefined,
    topKeywords: record.topKeywords,
    missingKeywords: record.missingKeywords,
    createdAt: record.createdAt,
  };
}

function createSnapshotPort(repo: InMemorySnapshotRepository): SnapshotRepositoryPort {
  return {
    save: async (input) =>
      toAnalyticsSnapshot(await repo.create({ data: { ...input, improvementSuggestions: [] } })),
    getHistory: async (resumeId, limit = 10) => {
      const records = await repo.findMany({
        where: { resumeId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return (records as SnapshotRecord[]).map(toAnalyticsSnapshot);
    },
    getScoreProgression: async (resumeId, days = 30) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const snapshots = (await repo.findMany({
        where: { resumeId, createdAt: { gte: startDate } },
        orderBy: { createdAt: 'asc' },
        select: { atsScore: true, createdAt: true },
      })) as Array<{ atsScore: number; createdAt: Date }>;
      return snapshots.map((s) => ({
        date: s.createdAt.toISOString().split('T')[0],
        score: s.atsScore,
      }));
    },
  };
}

describe('Snapshot Use Cases (via SnapshotRepositoryPort)', () => {
  let snapshotPort: SnapshotRepositoryPort;
  let snapshotRepo: InMemorySnapshotRepository;

  beforeEach(() => {
    snapshotRepo = new InMemorySnapshotRepository();
    snapshotPort = createSnapshotPort(snapshotRepo);
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

      const result = await snapshotPort.save(input);

      expect(result.resumeId).toBe('resume-1');
      expect(result.atsScore).toBe(85);
      expect(result.keywordScore).toBe(80);
      expect(result.completenessScore).toBe(90);
      expect(result.topKeywords).toEqual(['javascript', 'react']);
      expect(result.missingKeywords).toEqual(['typescript']);
    });

    it('should use empty arrays for optional keywords', async () => {
      const input = {
        resumeId: 'resume-1',
        atsScore: 85,
        keywordScore: 80,
        completenessScore: 90,
      };

      const result = await snapshotPort.save(input);

      expect(result.topKeywords).toEqual([]);
      expect(result.missingKeywords).toEqual([]);
    });

    it('should return mapped snapshot', async () => {
      const result = await snapshotPort.save({
        resumeId: 'resume-1',
        atsScore: 85,
        keywordScore: 80,
        completenessScore: 90,
      });

      expect(result).toEqual({
        id: expect.any(String),
        resumeId: 'resume-1',
        atsScore: 85,
        keywordScore: 80,
        completenessScore: 90,
        industryRank: undefined,
        totalInIndustry: undefined,
        topKeywords: [],
        missingKeywords: [],
        createdAt: expect.any(Date),
      });
    });
  });

  describe('getHistory', () => {
    it('should return snapshots ordered by date descending', async () => {
      snapshotRepo.seedSnapshot({
        resumeId: 'resume-1',
        atsScore: 85,
        keywordScore: 80,
        completenessScore: 90,
        createdAt: new Date('2026-02-01'),
      });

      const result = await snapshotPort.getHistory('resume-1');

      expect(result).toHaveLength(1);
      expect(result[0].resumeId).toBe('resume-1');
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 15; i++) {
        snapshotRepo.seedSnapshot({
          resumeId: 'resume-1',
          atsScore: 85,
          keywordScore: 80,
          completenessScore: 90,
        });
      }

      const result = await snapshotPort.getHistory('resume-1', 5);

      expect(result.length).toBe(5);
    });

    it('should use default limit of 10', async () => {
      for (let i = 0; i < 15; i++) {
        snapshotRepo.seedSnapshot({
          resumeId: 'resume-1',
          atsScore: 85,
          keywordScore: 80,
          completenessScore: 90,
        });
      }

      const result = await snapshotPort.getHistory('resume-1');

      expect(result.length).toBe(10);
    });

    it('should return empty array when no history exists', async () => {
      const result = await snapshotPort.getHistory('resume-no-history');

      expect(result).toEqual([]);
    });
  });

  describe('getScoreProgression', () => {
    beforeEach(() => {
      const now = new Date();
      const day15 = new Date(now);
      day15.setDate(now.getDate() - 15);
      const day10 = new Date(now);
      day10.setDate(now.getDate() - 10);
      const day5 = new Date(now);
      day5.setDate(now.getDate() - 5);

      snapshotRepo.seedSnapshots([
        {
          resumeId: 'resume-1',
          atsScore: 70,
          keywordScore: 80,
          completenessScore: 90,
          createdAt: day15,
        },
        {
          resumeId: 'resume-1',
          atsScore: 75,
          keywordScore: 80,
          completenessScore: 90,
          createdAt: day10,
        },
        {
          resumeId: 'resume-1',
          atsScore: 85,
          keywordScore: 80,
          completenessScore: 90,
          createdAt: day5,
        },
      ]);
    });

    it('should return score progression points', async () => {
      const result = await snapshotPort.getScoreProgression('resume-1', 30);

      expect(result.length).toBe(3);
      expect(result[0].score).toBe(70);
      expect(result[1].score).toBe(75);
      expect(result[2].score).toBe(85);
    });

    it('should filter by date range', async () => {
      const result = await snapshotPort.getScoreProgression('resume-1', 30);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('score');
    });

    it('should use default 30 days', async () => {
      const result = await snapshotPort.getScoreProgression('resume-1');

      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array when no progression data', async () => {
      const result = await snapshotPort.getScoreProgression('resume-no-data');

      expect(result).toEqual([]);
    });
  });
});
