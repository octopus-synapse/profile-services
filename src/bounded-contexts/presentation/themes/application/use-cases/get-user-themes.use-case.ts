/**
 * Get User Themes Use Case
 */

import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export class GetUserThemesUseCase {
  constructor(private readonly themeRepo: ThemeRepositoryPort) {}

  async execute(userId: string) {
    return this.themeRepo.findByAuthor(userId);
  }
}
