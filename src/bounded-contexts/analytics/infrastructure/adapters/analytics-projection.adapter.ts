import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AnalyticsProjectionPort } from '../../application/ports/analytics-projection.port';

@Injectable()
export class AnalyticsProjectionAdapter extends AnalyticsProjectionPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async upsertProjection(
    resumeId: string,
    data: { userId: string; title: string },
  ): Promise<void> {
    await this.prisma.analyticsResumeProjection.upsert({
      where: { id: resumeId },
      create: {
        id: resumeId,
        userId: data.userId,
        title: data.title,
        sectionCounts: {},
      },
      update: {
        userId: data.userId,
        title: data.title,
      },
    });
  }

  async deleteProjection(resumeId: string): Promise<void> {
    await this.prisma.analyticsResumeProjection.deleteMany({
      where: { id: resumeId },
    });
  }

  async touchProjection(resumeId: string): Promise<void> {
    await this.prisma.analyticsResumeProjection.update({
      where: { id: resumeId },
      data: {},
    });
  }

  async incrementSectionCount(resumeId: string, semanticKind: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE analytics_resume_projection
      SET "sectionCounts" = jsonb_set(
        "sectionCounts",
        ${[semanticKind]}::text[],
        to_jsonb(COALESCE(("sectionCounts"->${semanticKind})::int, 0) + 1)
      ),
      "updatedAt" = NOW()
      WHERE id = ${resumeId}
    `;
  }

  async decrementSectionCount(resumeId: string, semanticKind: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE analytics_resume_projection
      SET "sectionCounts" = jsonb_set(
        "sectionCounts",
        ${[semanticKind]}::text[],
        to_jsonb(GREATEST(COALESCE(("sectionCounts"->${semanticKind})::int, 0) - 1, 0))
      ),
      "updatedAt" = NOW()
      WHERE id = ${resumeId}
    `;
  }
}
