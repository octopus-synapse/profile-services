/**
 * Prisma adapter for `ResumeQualitySnapshotPort`. Reads from
 * `ResumeQualityScoreHistory` (owned by the resume-quality BC) and
 * `Resume` (owned by the resumes BC). Both reads are scoped to a
 * single resume so cross-tenant leakage is impossible.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type ResumeQualitySnapshot,
  ResumeQualitySnapshotPort,
} from '../../../domain/ports/resume-quality-snapshot.port';

export class PrismaResumeQualitySnapshotAdapter extends ResumeQualitySnapshotPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findRecentSnapshots(resumeId: string, take: number): Promise<ResumeQualitySnapshot[]> {
    const rows = await this.prisma.resumeQualityScoreHistory.findMany({
      where: { resumeId },
      orderBy: { computedAt: 'desc' },
      take,
      select: { overallScore: true, computedAt: true },
    });
    return rows.map((r) => ({ overallScore: r.overallScore, computedAt: r.computedAt }));
  }

  async findResumeOwnerId(resumeId: string): Promise<string | null> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { userId: true },
    });
    return resume?.userId ?? null;
  }
}
