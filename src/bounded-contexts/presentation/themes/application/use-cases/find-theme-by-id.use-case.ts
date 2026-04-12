/**
 * Find Theme By ID Use Case
 *
 * Returns theme with author info. All themes are public.
 */

import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export class FindThemeByIdUseCase {
  constructor(private readonly themeRepo: ThemeRepositoryPort) {}

  async execute(themeId: string) {
    return this.themeRepo.findByIdWithAuthor(themeId);
  }
}
