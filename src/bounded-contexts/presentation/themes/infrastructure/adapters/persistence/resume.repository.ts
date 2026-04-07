/**
 * Resume Prisma Repository (Themes context)
 *
 * Infrastructure adapter for resume operations needed by theme use cases.
 */

import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  ResumeRepositoryPort,
  type ResumeWithTheme,
} from '../../../domain/ports/resume.repository.port';

export class ResumeRepository extends ResumeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<{ id: string; userId: string } | null> {
    return this.prisma.resume.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
  }

  async findByIdWithTheme(id: string): Promise<ResumeWithTheme | null> {
    const result = await this.prisma.resume.findUnique({
      where: { id },
      include: { activeTheme: true },
    });
    return result;
  }

  async applyTheme(
    resumeId: string,
    themeId: string,
    customizations: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        activeThemeId: themeId,
        customTheme: customizations,
      },
    });
  }
}
