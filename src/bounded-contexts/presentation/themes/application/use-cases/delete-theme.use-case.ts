/**
 * Delete Theme Use Case
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export class DeleteThemeUseCase {
  constructor(private readonly themeRepo: ThemeRepositoryPort) {}

  async execute(userId: string, themeId: string) {
    const existingTheme = await this.themeRepo.findById(themeId);
    if (!existingTheme) throw new NotFoundException(ERROR_MESSAGES.THEME_NOT_FOUND);

    if (existingTheme.isSystemTheme) {
      throw new ForbiddenException(ERROR_MESSAGES.CANNOT_DELETE_SYSTEM_THEMES);
    }
    if (existingTheme.authorId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.CAN_ONLY_DELETE_OWN_THEMES);
    }

    return this.themeRepo.delete(themeId);
  }
}
