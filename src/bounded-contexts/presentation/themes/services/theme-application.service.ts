/**
 * Theme Application Service
 * Handles applying themes to resumes and managing customizations
 */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventPublisher } from '@/shared-kernel';
import type {
  ApplyThemeToResume,
  ForkTheme,
} from '@/shared-kernel';
import { ThemeCrudService } from './theme-crud.service';
import { ThemeQueryService } from './theme-query.service';
import { ThemeAppliedEvent } from '../../domain/events';
import { deepMerge } from '../utils';
import { ThemeStatus, Prisma } from '@prisma/client';
import { ERROR_MESSAGES } from '@/shared-kernel';

@Injectable()
export class ThemeApplicationService {
  constructor(
    private prisma: PrismaService,
    private eventPublisher: EventPublisher,
    private crud: ThemeCrudService,
    private query: ThemeQueryService,
  ) {}

  async applyToResume(userId: string, applyThemeData: ApplyThemeToResume) {
    const existingResume = await this.prisma.resume.findUnique({
      where: { id: applyThemeData.resumeId },
    });

    if (existingResume?.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.RESUME_ACCESS_DENIED);
    }

    // Verify theme access
    const selectedTheme = await this.query.findThemeById(
      applyThemeData.themeId,
      userId,
    );
    if (!selectedTheme) {
      throw new NotFoundException(ERROR_MESSAGES.THEME_ACCESS_DENIED);
    }

    // Apply theme and increment usage
    await this.prisma.$transaction([
      this.prisma.resume.update({
        where: { id: applyThemeData.resumeId },
        data: {
          activeThemeId: applyThemeData.themeId,
          customTheme: (applyThemeData.customizations ??
            Prisma.JsonNull) as Prisma.InputJsonValue,
        },
      }),
      this.prisma.resumeTheme.update({
        where: { id: applyThemeData.themeId },
        data: { usageCount: { increment: 1 } },
      }),
    ]);

    this.eventPublisher.publish(
      new ThemeAppliedEvent(applyThemeData.themeId, {
        resumeId: applyThemeData.resumeId,
        userId,
      }),
    );

    return { success: true };
  }

  async forkThemeForUser(userId: string, forkThemeData: ForkTheme) {
    const originalTheme = await this.crud.findThemeByIdOrThrow(
      forkThemeData.themeId,
    );

    // Can fork published or own themes
    if (
      originalTheme.status !== ThemeStatus.PUBLISHED &&
      originalTheme.authorId !== userId
    ) {
      throw new ForbiddenException(ERROR_MESSAGES.CANNOT_FORK_THEME);
    }

    const forkedThemeData = {
      name: forkThemeData.name,
      description: `Forked from ${originalTheme.name}`,
      category: originalTheme.category,
      tags: originalTheme.tags,
      styleConfig: originalTheme.styleConfig as Prisma.InputJsonValue,
      parentThemeId: originalTheme.id,
      authorId: userId,
      status: ThemeStatus.PRIVATE,
    };

    return this.prisma.resumeTheme.create({
      data: forkedThemeData,
    });
  }

  async getResolvedConfig(resumeId: string, userId: string) {
    const existingResume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: { activeTheme: true },
    });

    if (!existingResume || existingResume.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    if (!existingResume.activeTheme) {
      return null;
    }

    const baseThemeConfig = existingResume.activeTheme.styleConfig as Record<
      string,
      unknown
    >;
    const customThemeOverrides = existingResume.customTheme as Record<
      string,
      unknown
    > | null;

    if (!customThemeOverrides) return baseThemeConfig;

    return deepMerge(baseThemeConfig, customThemeOverrides);
  }
}
