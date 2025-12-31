/**
 * Theme Application Service
 * Handles applying themes to resumes and managing customizations
 */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplyThemeToResumeDto, ForkThemeDto } from '../dto';
import { ThemeCrudService } from './theme-crud.service';
import { ThemeQueryService } from './theme-query.service';
import { deepMerge } from '../utils';
import { ThemeStatus, Prisma } from '@prisma/client';
import { ERROR_MESSAGES } from '../../common/constants/app.constants';

@Injectable()
export class ThemeApplicationService {
  constructor(
    private prisma: PrismaService,
    private crud: ThemeCrudService,
    private query: ThemeQueryService,
  ) {}

  async applyToResume(userId: string, dto: ApplyThemeToResumeDto) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: dto.resumeId },
    });

    if (resume?.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.RESUME_ACCESS_DENIED);
    }

    // Verify theme access
    const theme = await this.query.findOne(dto.themeId, userId);
    if (!theme) {
      throw new NotFoundException(ERROR_MESSAGES.THEME_ACCESS_DENIED);
    }

    // Apply theme and increment usage
    await this.prisma.$transaction([
      this.prisma.resume.update({
        where: { id: dto.resumeId },
        data: {
          activeThemeId: dto.themeId,
          customTheme: (dto.customizations ??
            Prisma.JsonNull) as Prisma.InputJsonValue,
        },
      }),
      this.prisma.resumeTheme.update({
        where: { id: dto.themeId },
        data: { usageCount: { increment: 1 } },
      }),
    ]);

    return { success: true };
  }

  async fork(userId: string, dto: ForkThemeDto) {
    const original = await this.crud.findOrFail(dto.themeId);

    // Can fork published or own themes
    if (
      original.status !== ThemeStatus.PUBLISHED &&
      original.authorId !== userId
    ) {
      throw new ForbiddenException(ERROR_MESSAGES.CANNOT_FORK_THEME);
    }

    return this.prisma.resumeTheme.create({
      data: {
        name: dto.name,
        description: `Forked from ${original.name}`,
        category: original.category,
        tags: original.tags,
        styleConfig: original.styleConfig as Prisma.InputJsonValue,
        parentThemeId: original.id,
        authorId: userId,
        status: ThemeStatus.PRIVATE,
      },
    });
  }

  async getResolvedConfig(resumeId: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: { activeTheme: true },
    });

    if (!resume || resume.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.RESUME_NOT_FOUND);
    }

    if (!resume.activeTheme) {
      return null;
    }

    const baseConfig = resume.activeTheme.styleConfig as Record<
      string,
      unknown
    >;
    const overrides = resume.customTheme as Record<string, unknown> | null;

    if (!overrides) return baseConfig;

    return deepMerge(baseConfig, overrides);
  }
}
