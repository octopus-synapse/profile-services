/**
 * Create Theme Use Case
 *
 * BUG-006 FIX: Enforces max 5 themes per user limit.
 */

import { UnprocessableEntityException } from '@nestjs/common';
import { Prisma, ThemeStatus } from '@prisma/client';
import type { CreateTheme } from '@/shared-kernel';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { validateLayoutConfig, validateSectionsConfig } from '../../validators';

const MAX_THEMES_PER_USER = 5;

export class CreateThemeUseCase {
  constructor(private readonly themeRepo: ThemeRepositoryPort) {}

  async execute(userId: string, themeData: CreateTheme) {
    this.validateConfig(themeData.styleConfig);

    const existingThemeCount = await this.themeRepo.countByAuthor(userId);
    if (existingThemeCount >= MAX_THEMES_PER_USER) {
      throw new UnprocessableEntityException(ERROR_MESSAGES.THEME_LIMIT_REACHED);
    }

    return this.themeRepo.create({
      name: themeData.name,
      description: themeData.description,
      category: themeData.category,
      tags: themeData.tags ?? [],
      styleConfig: themeData.styleConfig as Prisma.InputJsonValue,
      parentThemeId: themeData.parentThemeId,
      authorId: userId,
      status: ThemeStatus.PRIVATE,
    });
  }

  private validateConfig(config: Record<string, unknown>) {
    if (config.layout) validateLayoutConfig(config.layout);
    if (config.sections) validateSectionsConfig(config.sections);
  }
}
