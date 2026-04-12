/**
 * Get Popular Themes Use Case
 */

import { APP_CONFIG } from '@/shared-kernel';
import type { ThemeRepositoryPort } from '../../domain/ports/theme.repository.port';

export class GetPopularThemesUseCase {
  constructor(private readonly themeRepo: ThemeRepositoryPort) {}

  async execute(limit: number = APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT) {
    return this.themeRepo.findPopular(limit);
  }
}
