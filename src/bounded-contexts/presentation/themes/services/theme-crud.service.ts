/**
 * Theme CRUD Service
 *
 * Admin-only CRUD operations for themes.
 * All themes are public. Users can only read/apply themes.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { CreateTheme, ERROR_MESSAGES, UpdateTheme } from '@/shared-kernel';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { AtsScorngPort } from '../domain/ports/ats-scoring.port';
import { AuthorizationPort } from '../domain/ports/authorization.port';
import { ThemePreviewPort } from '../domain/ports/theme-preview.port';
import { validateLayoutConfig, validateSectionsConfig } from '../validators';

@Injectable()
export class ThemeCrudService {
  private readonly logger = new Logger(ThemeCrudService.name);

  constructor(
    private prisma: PrismaService,
    private authorizationService: AuthorizationPort,
    private atsScoring: AtsScorngPort,
    private previewService: ThemePreviewPort,
  ) {}

  private calculateAtsScore(styleConfig: Record<string, unknown>): number {
    const breakdown = this.atsScoring.score(styleConfig);
    return this.atsScoring.calculateOverallScore(breakdown);
  }

  async createThemeForUser(adminId: string, themeData: CreateTheme) {
    await this.assertIsAdmin(adminId);
    this.validateConfig(themeData.styleConfig);

    const theme = await this.prisma.resumeTheme.create({
      data: {
        name: themeData.name,
        description: themeData.description,
        category: themeData.category,
        tags: themeData.tags ?? [],
        styleConfig: themeData.styleConfig as Prisma.InputJsonValue,
        parentThemeId: themeData.parentThemeId,
        authorId: adminId,
        status: 'PUBLISHED',
        approvedById: adminId,
        approvedAt: new Date(),
        publishedAt: new Date(),
        atsScore: this.calculateAtsScore(themeData.styleConfig),
      },
    });

    this.previewService.generateAndUploadPreview(theme.id).catch((err) => {
      this.logger.warn(
        `Preview generation failed for theme ${theme.id}: ${(err as Error).message}`,
      );
    });

    return theme;
  }

  async updateThemeForUser(adminId: string, themeId: string, updateThemeData: UpdateTheme) {
    const existingTheme = await this.findThemeByIdOrThrow(themeId);
    await this.assertCanEdit(existingTheme, adminId);

    if (updateThemeData.styleConfig) {
      this.validateConfig(updateThemeData.styleConfig);
    }

    const theme = await this.prisma.resumeTheme.update({
      where: { id: themeId },
      data: {
        name: updateThemeData.name,
        description: updateThemeData.description,
        category: updateThemeData.category,
        tags: updateThemeData.tags,
        styleConfig: updateThemeData.styleConfig as Prisma.InputJsonValue,
        ...(updateThemeData.styleConfig && {
          atsScore: this.calculateAtsScore(updateThemeData.styleConfig),
        }),
      },
    });

    if (updateThemeData.styleConfig) {
      this.previewService.generateAndUploadPreview(theme.id).catch((err) => {
        this.logger.warn(
          `Preview regeneration failed for theme ${theme.id}: ${(err as Error).message}`,
        );
      });
    }

    return theme;
  }

  async deleteThemeForUser(adminId: string, themeId: string) {
    const existingTheme = await this.findThemeByIdOrThrow(themeId);

    if (existingTheme.isSystemTheme) {
      throw new ForbiddenException(ERROR_MESSAGES.CANNOT_DELETE_SYSTEM_THEMES);
    }
    if (existingTheme.authorId !== adminId) {
      await this.assertIsAdmin(adminId);
    }

    return this.prisma.resumeTheme.delete({ where: { id: themeId } });
  }

  async findThemeByIdOrThrow(themeId: string) {
    const foundTheme = await this.prisma.resumeTheme.findUnique({
      where: { id: themeId },
    });
    if (!foundTheme) throw new EntityNotFoundException('Theme', themeId);
    return foundTheme;
  }

  private async assertIsAdmin(userId: string) {
    const hasPermission = await this.authorizationService.hasPermission(userId, 'theme', 'manage');
    if (!hasPermission) {
      throw new ForbiddenException(ERROR_MESSAGES.ONLY_ADMINS_CAN_DO_THIS);
    }
  }

  private validateConfig(config: Record<string, unknown>) {
    if (config.layout) validateLayoutConfig(config.layout);
    if (config.sections) validateSectionsConfig(config.sections);
  }

  private async assertCanEdit(theme: { authorId: string; isSystemTheme: boolean }, userId: string) {
    if (theme.isSystemTheme) {
      await this.assertIsAdmin(userId);
    } else if (theme.authorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.CAN_ONLY_EDIT_OWN_THEMES);
    }
  }
}
