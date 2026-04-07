/**
 * Find Theme By ID Use Case
 *
 * Returns theme with author info, respecting visibility rules.
 */

import { ThemeStatus } from '@prisma/client';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export class FindThemeByIdUseCase {
  constructor(private readonly themeRepo: ThemeRepositoryPort) {}

  async execute(themeId: string, userId?: string) {
    const foundTheme = await this.themeRepo.findByIdWithAuthor(themeId);

    if (!foundTheme) return null;
    if (foundTheme.status !== ThemeStatus.PUBLISHED && foundTheme.authorId !== userId) {
      return null;
    }

    return foundTheme;
  }
}
