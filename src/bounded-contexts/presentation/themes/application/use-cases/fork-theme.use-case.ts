/**
 * Fork Theme Use Case
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, ThemeStatus } from '@prisma/client';
import type { ForkTheme } from '@/shared-kernel';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export class ForkThemeUseCase {
  constructor(private readonly themeRepo: ThemeRepositoryPort) {}

  async execute(userId: string, forkThemeData: ForkTheme) {
    const originalTheme = await this.themeRepo.findById(forkThemeData.themeId);
    if (!originalTheme) throw new NotFoundException(ERROR_MESSAGES.THEME_NOT_FOUND);

    if (originalTheme.status !== ThemeStatus.PUBLISHED && originalTheme.authorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.CANNOT_FORK_THEME);
    }

    return this.themeRepo.create({
      name: forkThemeData.name,
      description: `Forked from ${originalTheme.name}`,
      category: originalTheme.category,
      tags: originalTheme.tags,
      styleConfig: originalTheme.styleConfig as Prisma.InputJsonValue,
      parentThemeId: originalTheme.id,
      authorId: userId,
      status: ThemeStatus.PRIVATE,
    });
  }
}
