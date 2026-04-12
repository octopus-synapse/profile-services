/**
 * Create Theme As Admin Use Case
 *
 * BUG-013 FIX: Admin can create themes directly as PUBLISHED.
 */

import { ForbiddenException } from '@nestjs/common';
import type { CreateTheme } from '@/shared-kernel';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { AuthorizationPort } from '../../domain/ports/authorization.port';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';
import { type JsonValue, ThemeStatus } from '../../domain/ports/theme.repository.port';
import { validateLayoutConfig, validateSectionsConfig } from '../../validators';

export class CreateThemeAsAdminUseCase {
  constructor(
    private readonly themeRepo: ThemeRepositoryPort,
    private readonly authorization: AuthorizationPort,
  ) {}

  async execute(adminId: string, themeData: CreateTheme) {
    await this.assertIsAdmin(adminId);
    this.validateConfig(themeData.styleConfig);

    return this.themeRepo.create({
      name: themeData.name,
      description: themeData.description,
      category: themeData.category,
      tags: themeData.tags ?? [],
      styleConfig: themeData.styleConfig as JsonValue,
      parentThemeId: themeData.parentThemeId,
      authorId: adminId,
      status: ThemeStatus.PUBLISHED,
      approvedById: adminId,
      approvedAt: new Date(),
      publishedAt: new Date(),
    });
  }

  private async assertIsAdmin(userId: string) {
    const hasPermission = await this.authorization.hasPermission(userId, 'theme', 'manage');
    if (!hasPermission) {
      throw new ForbiddenException(ERROR_MESSAGES.ONLY_ADMINS_CAN_DO_THIS);
    }
  }

  private validateConfig(config: Record<string, unknown>) {
    if (config.layout) validateLayoutConfig(config.layout);
    if (config.sections) validateSectionsConfig(config.sections);
  }
}
