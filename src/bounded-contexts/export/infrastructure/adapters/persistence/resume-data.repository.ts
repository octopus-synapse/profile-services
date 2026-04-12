/**
 * Resume Data Repository
 *
 * Prisma implementation of ResumeDataRepositoryPort for export use cases.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  ResumeDataRepositoryPort,
  ResumeForJsonExport,
  ResumeForLatexExport,
} from '../../../domain/ports/resume-data.repository.port';

export class ResumeDataRepository implements ResumeDataRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findForJsonExport(resumeId: string): Promise<ResumeForJsonExport | null> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: true,
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
                content: true,
              },
            },
          },
        },
      },
    });

    if (!resume) return null;

    return {
      id: resume.id,
      title: resume.title,
      slug: resume.slug,
      summary: resume.summary,
      jobTitle: resume.jobTitle,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
      user: resume.user,
      sections: resume.resumeSections.map((rs) => ({
        semanticKind: rs.sectionType.semanticKind,
        items: rs.items.map((item) => ({
          content: item.content as Record<string, unknown>,
        })),
      })),
    };
  }

  async findForLatexExport(resumeId: string): Promise<ResumeForLatexExport | null> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: true,
        resumeSections: {
          include: {
            sectionType: {
              select: {
                key: true,
                semanticKind: true,
                title: true,
              },
            },
            items: {
              orderBy: { order: 'asc' },
              select: {
                content: true,
              },
            },
          },
        },
      },
    });

    if (!resume) return null;

    return {
      title: resume.title,
      fullName: resume.fullName,
      emailContact: resume.emailContact,
      phone: resume.phone,
      jobTitle: resume.jobTitle,
      user: resume.user,
      sections: resume.resumeSections.map((rs) => ({
        semanticKind: rs.sectionType.semanticKind,
        sectionTypeKey: rs.sectionType.key,
        title: rs.sectionType.title,
        items: rs.items.map((item) => item.content as Record<string, unknown>),
      })),
    };
  }
}
