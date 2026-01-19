/**
 * Spoken Languages Service
 * Query service for spoken language catalog
 */

import { Injectable } from '@nestjs/common';
import { APP_CONFIG } from '@octopus-synapse/profile-contracts';
import {
  SpokenLanguagesRepository,
  type SpokenLanguage,
} from '../repositories/spoken-languages.repository';

export type { SpokenLanguage };

@Injectable()
export class SpokenLanguagesService {
  constructor(private readonly repository: SpokenLanguagesRepository) {}

  /**
   * Get all active spoken languages ordered by order field
   */
  async findAllActiveLanguages(): Promise<SpokenLanguage[]> {
    return this.repository.findAllActive();
  }

  /**
   * Search spoken languages by name (in any supported language)
   */
  async searchLanguagesByName(
    searchQuery: string,
    limit: number = APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
  ): Promise<SpokenLanguage[]> {
    return this.repository.searchByName(searchQuery, limit);
  }

  /**
   * Get a single language by code
   */
  async findLanguageByCode(code: string): Promise<SpokenLanguage | null> {
    return this.repository.findByCode(code);
  }
}
