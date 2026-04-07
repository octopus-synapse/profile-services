/**
 * Get System Themes Use Case
 */

import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export class GetSystemThemesUseCase {
  constructor(private readonly themeRepo: ThemeRepositoryPort) {}

  async execute() {
    return this.themeRepo.findSystemThemes();
  }
}
