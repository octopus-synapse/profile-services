/**
 * Prisma Snapshot Repository
 *
 * Snapshots are persisted on `ResumeQualityScoreHistory`. The
 * resume-analytics BC predates the scoring subsystem refactor and used
 * to own its own table; that surface was dropped, but the history
 * timeline still lives — we just read/write through the new table.
 *
 * `ResumeQualityScoreHistory` carries:
 *   - `overallScore`, `completenessScore`: the two atomic numbers we
 *     surface as `atsScore` and `completenessScore` here. The
 *     historical `keywordScore`/`topKeywords`/`missingKeywords` fields
 *     are not tracked anymore — they map to defaults so the public
 *     `AnalyticsSnapshot` shape stays stable.
 *   - `issuesJson`, `scoringRulesVersion`, `aiPromptVersion` etc.: the
 *     scoring subsystem owns these; we ignore them on read and pass
 *     defaults on write so this repo stays thin.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SnapshotRepositoryPort } from '../../../application/ports/resume-analytics.port';
import type { AnalyticsSnapshot } from '../../../interfaces';

interface QualityHistoryRow {
  id: string;
  resumeId: string;
  overallScore: number;
  completenessScore: number;
  computedAt: Date;
}

function toSnapshot(row: QualityHistoryRow): AnalyticsSnapshot {
  return {
    id: row.id,
    resumeId: row.resumeId,
    atsScore: row.overallScore,
    keywordScore: row.completenessScore,
    completenessScore: row.completenessScore,
    industryRank: undefined,
    totalInIndustry: undefined,
    topKeywords: [],
    missingKeywords: [],
    createdAt: row.computedAt,
  };
}

export class PrismaSnapshotRepository implements SnapshotRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: {
    resumeId: string;
    atsScore: number;
    keywordScore: number;
    completenessScore: number;
    topKeywords?: string[];
    missingKeywords?: string[];
  }): Promise<AnalyticsSnapshot> {
    // We don't have rule/prompt context inside this BC. Use a stable
    // identifier for the version columns so audit queries can group
    // analytics-driven snapshots separately from scoring-engine ones.
    const row = await this.prisma.resumeQualityScoreHistory.create({
      data: {
        resumeId: input.resumeId,
        overallScore: input.atsScore,
        completenessScore: input.completenessScore,
        contentQualityScore: null,
        issuesJson: [],
        scoringRulesVersion: 'analytics-snapshot/1.0.0',
        aiPromptVersion: null,
      },
    });
    return toSnapshot(row);
  }

  async getHistory(resumeId: string, limit = 10): Promise<AnalyticsSnapshot[]> {
    const rows = await this.prisma.resumeQualityScoreHistory.findMany({
      where: { resumeId },
      orderBy: { computedAt: 'desc' },
      take: limit,
    });
    return rows.map(toSnapshot);
  }

  async getScoreProgression(
    resumeId: string,
    days = 30,
  ): Promise<Array<{ date: string; score: number }>> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.resumeQualityScoreHistory.findMany({
      where: { resumeId, computedAt: { gte: since } },
      orderBy: { computedAt: 'asc' },
      select: { computedAt: true, overallScore: true },
    });
    return rows.map((r) => ({ date: r.computedAt.toISOString(), score: r.overallScore }));
  }
}
