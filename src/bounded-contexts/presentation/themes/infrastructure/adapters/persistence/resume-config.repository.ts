/**
 * Resume Config Prisma Repository
 *
 * Infrastructure adapter for resume style configuration operations.
 */

import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ERROR_MESSAGES } from '@/shared-kernel';
import {
  type ResumeConfig,
  ResumeConfigRepositoryPort,
} from '../../../domain/ports/resume-config.repository.port';

export class ResumeConfigRepository extends ResumeConfigRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

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
      data: { customTheme: this.toInputJsonValue(config) },
    });
  }

  async reorderSectionDirect(
    resumeId: string,
    sectionTypeKey: string,
    newOrder: number,
  ): Promise<void> {
    const resumeSections = await this.prisma.resumeSection.findMany({
      where: { resumeId },
      include: { sectionType: { select: { key: true } } },
      orderBy: { order: 'asc' },
    });

    const fromIndex = resumeSections.findIndex((rs) => rs.sectionType.key === sectionTypeKey);
    if (fromIndex === -1) {
      throw new Error(`Section ${sectionTypeKey} not found`);
    }

    const toIndex = Math.max(0, Math.min(newOrder, resumeSections.length - 1));

    const [moved] = resumeSections.splice(fromIndex, 1);
    resumeSections.splice(toIndex, 0, moved);

    for (let i = 0; i < resumeSections.length; i++) {
      await this.prisma.resumeSection.update({
        where: { id: resumeSections[i].id },
        data: { order: i },
      });
    }
  }

  async batchUpdateSectionsDirect(
    resumeId: string,
    updates: Array<{ id: string; order?: number; visible?: boolean }>,
  ): Promise<void> {
    const resumeSections = await this.prisma.resumeSection.findMany({
      where: { resumeId },
      include: { sectionType: { select: { key: true } } },
      orderBy: { order: 'asc' },
    });

    for (const update of updates) {
      const section = resumeSections.find(
        (rs) => rs.sectionType.key === update.id || rs.id === update.id,
      );
      if (section) {
        if (update.order !== undefined) {
          (section as typeof section & { _newOrder: number })._newOrder = update.order;
        }
        if (update.visible !== undefined) {
          (section as typeof section & { _newVisible: boolean })._newVisible = update.visible;
        }
      }
    }

    const sectionsWithOrder = resumeSections
      .map((rs) => ({
        ...rs,
        newOrder:
          (rs as typeof rs & { _newOrder?: number })._newOrder !== undefined
            ? (rs as typeof rs & { _newOrder: number })._newOrder
            : rs.order,
        newVisible:
          (rs as typeof rs & { _newVisible?: boolean })._newVisible !== undefined
            ? (rs as typeof rs & { _newVisible: boolean })._newVisible
            : rs.isVisible,
      }))
      .sort((a, b) => a.newOrder - b.newOrder);

    for (let i = 0; i < sectionsWithOrder.length; i++) {
      await this.prisma.resumeSection.update({
        where: { id: sectionsWithOrder[i].id },
        data: {
          order: i,
          isVisible: sectionsWithOrder[i].newVisible,
        },
      });
    }
  }

  private toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.toInputJsonValueOrNull(item))
        .filter((item): item is Prisma.InputJsonValue => item !== null);
    }

    if (value && typeof value === 'object') {
      const record: Record<string, Prisma.InputJsonValue> = {};

      for (const [key, item] of Object.entries(value)) {
        const parsed = this.toInputJsonValueOrNull(item);
        if (parsed !== null) {
          record[key] = parsed;
        }
      }

      return record;
    }

    return {};
  }

  private toInputJsonValueOrNull(value: unknown): Prisma.InputJsonValue | null {
    if (value === null) {
      return null;
    }

    return this.toInputJsonValue(value);
  }
}
