import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeLoaderPort } from '../../../domain/ports/resume-loader.port';
import type { ResumeForCompleteness } from '../../../domain/rules/completeness.rules';

/**
 * Prisma-backed ResumeLoader. Pulls just enough fields for the
 * completeness rules — the rich payload (sections, items, full bullets)
 * is the job of the future Content Quality AI call, not this path.
 *
 * Framework-free POJO. Wired by `resume-quality.composition.ts`.
 */
export class PrismaResumeLoader extends ResumeLoaderPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async load(resumeId: string): Promise<ResumeForCompleteness | null> {
    const row = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: {
        fullName: true,
        emailContact: true,
        summary: true,
        jobTitle: true,
        // The domain shape stays minimal; richer section/item data is
        // loaded by the AI adapter in Task #19.
      },
    });
    if (!row) return null;

    return {
      fullName: row.fullName,
      emailContact: row.emailContact,
      summary: row.summary,
      jobTitle: row.jobTitle,
      experiences: [],
      educations: [],
      skills: [],
    };
  }
}
