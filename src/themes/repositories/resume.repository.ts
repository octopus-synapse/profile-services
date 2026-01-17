/**
 * Resume Repository (Theme-scoped)
 * Low-level persistence operations for Resume entity within themes context
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface ResumeThemeUpdateData {
  activeThemeId: string;
  customTheme: Prisma.InputJsonValue;
}

@Injectable()
export class ResumeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.resume.findUnique({
      where: { id },
    });
  }

  async findByIdWithTheme(id: string) {
    return this.prisma.resume.findUnique({
      where: { id },
      include: { activeTheme: true },
    });
  }

  async updateTheme(resumeId: string, data: ResumeThemeUpdateData) {
    return this.prisma.resume.update({
      where: { id: resumeId },
      data,
    });
  }

  async applyThemeTransaction(
    resumeId: string,
    themeId: string,
    customizations: Prisma.InputJsonValue,
  ) {
    return this.prisma.$transaction([
      this.prisma.resume.update({
        where: { id: resumeId },
        data: {
          activeThemeId: themeId,
          customTheme: customizations,
        },
      }),
      this.prisma.resumeTheme.update({
        where: { id: themeId },
        data: { usageCount: { increment: 1 } },
      }),
    ]);
  }

  async updateCustomTheme(resumeId: string, config: Prisma.InputJsonValue) {
    return this.prisma.resume.update({
      where: { id: resumeId },
      data: { customTheme: config },
    });
  }
}
