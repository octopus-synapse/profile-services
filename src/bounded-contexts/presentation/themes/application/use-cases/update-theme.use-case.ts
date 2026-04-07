/**
 * Update Theme Use Case
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UpdateTheme } from '@/shared-kernel';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { AuthorizationPort } from '../../domain/ports/authorization.port';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { validateLayoutConfig, validateSectionsConfig } from '../../validators';

export class UpdateThemeUseCase {
  constructor(
    private readonly themeRepo: ThemeRepositoryPort,
    private readonly authorization: AuthorizationPort,
  ) {}

  async execute(userId: string, themeId: string, updateThemeData: UpdateTheme) {
    const existingTheme = await this.themeRepo.findById(themeId);
    if (!existingTheme) throw new NotFoundException(ERROR_MESSAGES.THEME_NOT_FOUND);

    await this.assertCanEdit(existingTheme, userId);

    if (updateThemeData.styleConfig) {
      this.validateConfig(updateThemeData.styleConfig);
    }

    return this.themeRepo.update(themeId, {
      name: updateThemeData.name,
      description: updateThemeData.description,
      category: updateThemeData.category,
      tags: updateThemeData.tags,
      styleConfig: updateThemeData.styleConfig as Prisma.InputJsonValue,
    });
  }

  private async assertCanEdit(
    theme: { authorId: string; isSystemTheme: boolean },
    userId: string,
  ) {
    if (theme.isSystemTheme) {
      const hasPermission = await this.authorization.hasPermission(userId, 'theme', 'manage');
      if (!hasPermission) {
        throw new ForbiddenException(ERROR_MESSAGES.ONLY_ADMINS_CAN_EDIT_SYSTEM_THEMES);
      }
    } else if (theme.authorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.CAN_ONLY_EDIT_OWN_THEMES);
    }
  }

  private validateConfig(config: Record<string, unknown>) {
    if (config.layout) validateLayoutConfig(config.layout);
    if (config.sections) validateSectionsConfig(config.sections);
  }
}
