/**
 * Get Theme Use Case
 */

import { NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export class GetThemeUseCase {
  constructor(private readonly themeRepo: ThemeRepositoryPort) {}

  async execute(themeId: string) {
    const theme = await this.themeRepo.findById(themeId);
    if (!theme) throw new NotFoundException(ERROR_MESSAGES.THEME_NOT_FOUND);
    return theme;
  }
}
