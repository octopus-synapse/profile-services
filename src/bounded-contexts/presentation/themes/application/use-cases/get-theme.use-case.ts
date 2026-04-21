/**
 * Get Theme Use Case
 */

import { ThemeNotFoundException } from '../../../domain/exceptions/presentation.exceptions';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export class GetThemeUseCase {
  constructor(private readonly themeRepo: ThemeRepositoryPort) {}

  async execute(themeId: string) {
    const theme = await this.themeRepo.findById(themeId);
    if (!theme) throw new ThemeNotFoundException();
    return theme;
  }
}
