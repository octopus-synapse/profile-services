import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import {
  QualityScoreRepositoryPort,
  type SavedQualityScore,
} from '../../../domain/ports/quality-score.repository.port';
import type { QualityBreakdown, QualityIssue } from '../../../domain/types';

/**
 * Append-only writer for `ResumeQualityScoreHistory`. Keeping a full
 * history (rather than upserting a single "latest" row) lets the UI
 * plot progression and the Ops team diagnose regressions when rule
 * versions change.
 */
@Injectable()
export class PrismaQualityScoreRepository extends QualityScoreRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async save(resumeId: string, breakdown: QualityBreakdown): Promise<SavedQualityScore> {
    const row = await this.prisma.resumeQualityScoreHistory.create({
      data: {
        resumeId,
        overallScore: breakdown.overallScore,
        completenessScore: breakdown.completenessScore,
        contentQualityScore: breakdown.contentQualityScore,
        issuesJson: breakdown.issues as unknown as Prisma.InputJsonValue,
        scoringRulesVersion: breakdown.scoringRulesVersion,
        aiPromptVersion: breakdown.aiPromptVersion,
        aiCallsCount: breakdown.aiCallsCount,
        costUsdMicros: breakdown.costUsdMicros,
      },
    });
    return this.toDomain(row);
  }

  async findLatest(resumeId: string): Promise<SavedQualityScore | null> {
    const row = await this.prisma.resumeQualityScoreHistory.findFirst({
      where: { resumeId },
      orderBy: { computedAt: 'desc' },
    });
    return row ? this.toDomain(row) : null;
  }

  async findHistory(resumeId: string, limit: number): Promise<readonly SavedQualityScore[]> {
    const rows = await this.prisma.resumeQualityScoreHistory.findMany({
      where: { resumeId },
      orderBy: { computedAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.toDomain(r));
  }

  private toDomain(row: {
    id: string;
    resumeId: string;
    overallScore: number;
    completenessScore: number;
    contentQualityScore: number | null;
    issuesJson: Prisma.JsonValue;
    scoringRulesVersion: string;
    aiPromptVersion: string | null;
    aiCallsCount: number;
    costUsdMicros: bigint;
    computedAt: Date;
  }): SavedQualityScore {
    return {
      id: row.id,
      resumeId: row.resumeId,
      overallScore: row.overallScore,
      completenessScore: row.completenessScore,
      contentQualityScore: row.contentQualityScore,
      issues: (row.issuesJson as unknown as QualityIssue[]) ?? [],
      scoringRulesVersion: row.scoringRulesVersion,
      aiPromptVersion: row.aiPromptVersion,
      aiCallsCount: row.aiCallsCount,
      costUsdMicros: row.costUsdMicros,
      computedAt: row.computedAt,
    };
  }
}
