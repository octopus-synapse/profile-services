import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeQualitySourcePort } from '../../../domain/ports/resume-quality-source.port';

/**
 * Reads the latest overall Resume Quality Score straight from the
 * append-only `ResumeQualityScoreHistory` table (latest by `computedAt`).
 * job-match only needs the single number for the Readiness blend, so
 * this stays a thin projection rather than dragging in the resume-quality
 * read use-case.
 */
export class PrismaResumeQualitySource extends ResumeQualitySourcePort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getLatestOverallScore(resumeId: string): Promise<number | null> {
    const row = await this.prisma.resumeQualityScoreHistory.findFirst({
      where: { resumeId },
      orderBy: { computedAt: 'desc' },
      select: { overallScore: true },
    });
    return row?.overallScore ?? null;
  }
}
