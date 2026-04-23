/**
 * Prisma Snapshot Repository — STUB
 *
 * The score columns on `ResumeAnalytics` (atsScore, keywordScore,
 * completenessScore, topKeywords, missingKeywords, industryRank,
 * totalInIndustry) were dropped as part of the scoring subsystem
 * refactor. Historical snapshots now live on
 * `ResumeQualityScoreHistory` (see docs/scoring/README.md). This repo
 * remains wired for backwards compatibility; the read/write methods
 * return empty results and the write is a no-op so consumers do not
 * crash. The follow-up task rewires callers onto the new table.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { SnapshotRepositoryPort } from '../../../application/ports/resume-analytics.port';
import type { AnalyticsSnapshot } from '../../../interfaces';

export class PrismaSnapshotRepository implements SnapshotRepositoryPort {
  constructor(private readonly _prisma: PrismaService) {}

  async save(input: {
    resumeId: string;
    atsScore: number;
    keywordScore: number;
    completenessScore: number;
    topKeywords?: string[];
    missingKeywords?: string[];
  }): Promise<AnalyticsSnapshot> {
    return {
      id: 'stub',
      resumeId: input.resumeId,
      atsScore: input.atsScore,
      keywordScore: input.keywordScore,
      completenessScore: input.completenessScore,
      industryRank: undefined,
      totalInIndustry: undefined,
      topKeywords: input.topKeywords ?? [],
      missingKeywords: input.missingKeywords ?? [],
      createdAt: new Date(),
    };
  }

  async getHistory(_resumeId: string, _limit = 10): Promise<AnalyticsSnapshot[]> {
    return [];
  }

  async getScoreProgression(
    _resumeId: string,
    _days = 30,
  ): Promise<Array<{ date: string; score: number }>> {
    return [];
  }
}
