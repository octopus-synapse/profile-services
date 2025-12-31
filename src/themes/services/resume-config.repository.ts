/**
 * Resume Config Repository
 * Low-level access to resume style configurations
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ERROR_MESSAGES } from '../../common/constants/app.constants';

export interface ResumeConfig {
  sections: Array<{
    id: string;
    visible: boolean;
    order: number;
    column: string;
  }>;
  itemOverrides: Record<
    string,
    Array<{ itemId: string; visible: boolean; order: number }>
  >;
  [key: string]: unknown;
}

@Injectable()
export class ResumeConfigRepository {
  constructor(private prisma: PrismaService) {}

  async get(userId: string, resumeId: string): Promise<ResumeConfig> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: { activeTheme: true },
    });

    if (!resume || resume.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    const base = (resume.activeTheme?.styleConfig ?? {}) as ResumeConfig;
    const custom = (resume.customTheme ?? {}) as Partial<ResumeConfig>;

    return {
      ...base,
      ...custom,
      sections: custom.sections ?? base.sections,
      itemOverrides: custom.itemOverrides ?? {},
    };
  }

  async save(resumeId: string, config: ResumeConfig): Promise<void> {
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: { customTheme: config as unknown as Prisma.InputJsonValue },
    });
  }
}
