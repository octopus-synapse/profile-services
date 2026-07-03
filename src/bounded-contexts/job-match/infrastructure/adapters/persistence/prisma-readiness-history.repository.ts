import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  ReadinessHistoryPort,
  type ReadinessTrendPoint,
  type SavedReadinessScore,
} from '../../../domain/ports/readiness-history.port';
import type { ReadinessBreakdown } from '../../../domain/readiness/readiness.types';

/**
 * Append-only persistence for Readiness Score snapshots, mirroring the
 * quality-score repository. Latest read is a plain `ORDER BY computedAt
 * DESC` (no materialised view — the row count per resume is small).
 */
export class PrismaReadinessHistory extends ReadinessHistoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(input: {
    resumeId: string;
    breakdown: ReadinessBreakdown;
  }): Promise<SavedReadinessScore> {
    const { resumeId, breakdown } = input;
    const row = await this.prisma.readinessScoreHistory.create({
      data: {
        resumeId,
        overallScore: breakdown.overallScore,
        qualityScore: breakdown.factors.quality.score,
        coverageScore: breakdown.factors.coverage.score,
        fitScore: breakdown.factors.fit.score,
        rulesVersion: breakdown.rulesVersion,
        computedAt: breakdown.computedAt,
      },
    });
    return this.toSaved(row);
  }

  async findLatest(resumeId: string): Promise<SavedReadinessScore | null> {
    const row = await this.prisma.readinessScoreHistory.findFirst({
      where: { resumeId },
      orderBy: { computedAt: 'desc' },
    });
    return row ? this.toSaved(row) : null;
  }

  async findTrend(resumeId: string, limit: number): Promise<readonly ReadinessTrendPoint[]> {
    const rows = await this.prisma.readinessScoreHistory.findMany({
      where: { resumeId },
      orderBy: { computedAt: 'desc' },
      take: limit,
      select: { overallScore: true, computedAt: true },
    });
    return rows.map((r) => ({ score: r.overallScore, computedAt: r.computedAt }));
  }

  private toSaved(row: {
    id: string;
    resumeId: string;
    overallScore: number;
    qualityScore: number | null;
    coverageScore: number | null;
    fitScore: number | null;
    rulesVersion: string;
    computedAt: Date;
  }): SavedReadinessScore {
    return {
      id: row.id,
      resumeId: row.resumeId,
      overallScore: row.overallScore,
      qualityScore: row.qualityScore,
      coverageScore: row.coverageScore,
      fitScore: row.fitScore,
      rulesVersion: row.rulesVersion,
      computedAt: row.computedAt,
    };
  }
}
