/**
 * Prisma Resume Ownership Repository
 *
 * Handles resume ownership verification and data retrieval for analytics.
 */

import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumeForAnalytics } from '../../../domain/types';
import type { ResumeOwnershipPort } from '../../../application/ports/resume-analytics.port';

export class PrismaResumeOwnershipRepository implements ResumeOwnershipPort {
  constructor(private readonly prisma: PrismaService) {}

  async verifyOwnership(resumeId: string, userId: string): Promise<void> {
    const projection = await this.prisma.analyticsResumeProjection.findFirst({
      where: { id: resumeId, userId },
      select: { id: true },
    });

    if (!projection) throw new NotFoundException('Resume not found or access denied');
  }

  async verifyResumeExists(resumeId: string): Promise<void> {
    const projection = await this.prisma.analyticsResumeProjection.findUnique({
      where: { id: resumeId },
      select: { id: true },
    });

    if (!projection) throw new NotFoundException('Resume not found');
  }

  async getResumeWithDetails(resumeId: string): Promise<ResumeForAnalytics> {
    const resume = await this.prisma.resume.findUniqueOrThrow({
      where: { id: resumeId },
      include: {
        resumeSections: {
          include: {
            sectionType: {
              select: {
                semanticKind: true,
              },
            },
            items: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                content: true,
              },
            },
          },
        },
      },
    });

    const sections = resume.resumeSections.map((rs) => ({
      id: rs.id,
      semanticKind: rs.sectionType.semanticKind,
      items: rs.items.map((item) => ({
        id: item.id,
        content: item.content as Record<string, unknown>,
      })),
    }));

    return {
      summary: resume.summary,
      emailContact: resume.emailContact,
      phone: resume.phone,
      jobTitle: resume.jobTitle,
      sections,
    };
  }
}
