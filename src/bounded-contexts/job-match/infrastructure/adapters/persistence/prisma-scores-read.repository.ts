import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type FitLifecycleRead,
  type LatestQualityRead,
  ScoresReadPort,
  type ScoreTrendRead,
} from '../../../domain/ports/scores-read.port';

/**
 * Prisma-direct projections for the unified scores endpoint. Each method
 * is a narrow read against the owning BC's table (primary resume, quality
 * history, active style, fit profile) — no cross-BC use-case calls, so
 * the aggregator stays a thin composition.
 */
export class PrismaScoresRead extends ScoresReadPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getPrimaryResumeId(userId: string): Promise<string | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryResumeId: true },
    });
    return row?.primaryResumeId ?? null;
  }

  async getLatestQuality(resumeId: string): Promise<LatestQualityRead | null> {
    const row = await this.prisma.resumeQualityScoreHistory.findFirst({
      where: { resumeId },
      orderBy: { computedAt: 'desc' },
      select: {
        overallScore: true,
        completenessScore: true,
        contentQualityScore: true,
        computedAt: true,
      },
    });
    return row
      ? {
          overallScore: row.overallScore,
          completenessScore: row.completenessScore,
          contentQualityScore: row.contentQualityScore,
          computedAt: row.computedAt,
        }
      : null;
  }

  async getQualityTrend(resumeId: string, limit: number): Promise<readonly ScoreTrendRead[]> {
    const rows = await this.prisma.resumeQualityScoreHistory.findMany({
      where: { resumeId },
      orderBy: { computedAt: 'desc' },
      take: limit,
      select: { overallScore: true, computedAt: true },
    });
    return rows.map((r) => ({ score: r.overallScore, computedAt: r.computedAt }));
  }

  async getStyleScoreForResume(resumeId: string): Promise<number | null> {
    const row = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { style: { select: { styleScore: true } } },
    });
    return row?.style?.styleScore ?? null;
  }

  async getFitLifecycle(userId: string): Promise<FitLifecycleRead> {
    const row = await this.prisma.userFitProfile.findUnique({
      where: { userId },
      select: { expiresAt: true },
    });
    if (!row) return { status: 'never', expiresAt: null };
    const status = row.expiresAt.getTime() > Date.now() ? 'responded' : 'expired';
    return { status, expiresAt: row.expiresAt };
  }
}
