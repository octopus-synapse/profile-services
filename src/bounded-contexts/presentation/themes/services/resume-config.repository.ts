/**
 * Resume Config Repository
 * Low-level access to resume style configurations
 */

import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ERROR_MESSAGES } from '@/shared-kernel';

export interface ResumeConfig {
  sections: Array<{
    id: string;
    visible: boolean;
    order: number;
    column: string;
  }>;
  itemOverrides: Record<string, Array<{ itemId: string; visible: boolean; order: number }>>;
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
