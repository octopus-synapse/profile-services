/**
 * Spoken Languages Service
 * Query service for spoken language catalog. Delegates persistence to the port.
 */

import { Injectable } from '@nestjs/common';
import { APP_CONFIG } from '@/shared-kernel';
import {
  type SpokenLanguage,
  SpokenLanguagesRepositoryPort,
} from '../application/ports/spoken-languages.port';

export type { SpokenLanguage };

@Injectable()
export class SpokenLanguagesService {
  constructor(private readonly repository: SpokenLanguagesRepositoryPort) {}

  async findAllActiveLanguages(): Promise<SpokenLanguage[]> {
    return this.repository.findAllActive();
  }

  async searchLanguagesByName(
    searchQuery: string,
    limit: number = APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
  ): Promise<SpokenLanguage[]> {
    return this.repository.searchByName(searchQuery, limit);
  }

  async findLanguageByCode(code: string): Promise<SpokenLanguage | null> {
    return this.repository.findByCode(code);
  }
}
