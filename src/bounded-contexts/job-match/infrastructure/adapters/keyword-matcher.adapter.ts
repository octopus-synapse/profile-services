import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeKeywordSourcePort } from '../../domain/ports/resume-keyword-source.port';

/**
 * Pulls the keyword bag for a resume from Prisma. MVP scope: read the
 * `primaryStack` array on the Resume row (already populated by
 * onboarding / import). When the skills catalog context ships a
 * normalised skills join, this adapter grows to include that source.
 */
@Injectable()
export class PrismaResumeKeywordSource extends ResumeKeywordSourcePort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getKeywords(resumeId: string): Promise<readonly string[]> {
    const row = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { primaryStack: true },
    });
    return row?.primaryStack ?? [];
  }
}
