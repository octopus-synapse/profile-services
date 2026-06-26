import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { readJsonColumn, toPrismaJson } from '@/shared-kernel/persistence/json-column';
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
 *
 * Framework-free POJO. Wired by `resume-quality.composition.ts`.
 */
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
        issuesJson: toPrismaJson(breakdown.issues),
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

  async findLatestForOwner(
    userId: string,
    resumeId: string,
  ): Promise<{ found: boolean; owned: boolean; snapshot: SavedQualityScore | null }> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { userId: true },
    });
    if (!resume) return { found: false, owned: false, snapshot: null };
    if (resume.userId !== userId) return { found: true, owned: false, snapshot: null };
    const snap = await this.findLatest(resumeId);
    return { found: true, owned: true, snapshot: snap };
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
      issues: readJsonColumn<QualityIssue[] | null>(row.issuesJson) ?? [],
      scoringRulesVersion: row.scoringRulesVersion,
      aiPromptVersion: row.aiPromptVersion,
      aiCallsCount: row.aiCallsCount,
      costUsdMicros: row.costUsdMicros,
      computedAt: row.computedAt,
    };
  }
}
