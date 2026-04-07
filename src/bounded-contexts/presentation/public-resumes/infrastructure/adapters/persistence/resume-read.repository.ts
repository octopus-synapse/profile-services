/**
 * Resume Read Prisma Repository (Public Resumes context)
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumeReadRepositoryPort } from '../../../domain/ports/resume-read.repository.port';

export class ResumeReadRepository extends ResumeReadRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<{ id: string; userId: string } | null> {
    return this.prisma.resume.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
  }

  async findByIdWithSections(id: string) {
    const result = await this.prisma.resume.findUnique({
      where: { id },
      include: {
        resumeSections: {
          include: {
            sectionType: {
              select: { semanticKind: true },
            },
            items: {
              orderBy: { order: 'asc' },
              select: { content: true },
            },
          },
        },
      },
    });
    return result;
  }
}
