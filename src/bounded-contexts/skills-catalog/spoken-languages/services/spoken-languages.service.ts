/**
 * Spoken Languages Service
 * Query service for spoken language catalog. Delegates persistence to the port.
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { APP_CONFIG } from '@/shared-kernel';
import {
  type SpokenLanguage,
  SpokenLanguagesRepositoryPort,
} from '../application/ports/spoken-languages.port';

export type { SpokenLanguage };

const SPOKEN_LANGUAGES_ALL_KEY = 'spoken_languages:all_active';
const SPOKEN_LANGUAGES_BY_CODE_PREFIX = 'spoken_languages:by_code:';
const SPOKEN_LANGUAGES_TTL = 60 * 60; // 1h — catalog quasi-static

@Injectable()
export class SpokenLanguagesService {
  constructor(
    private readonly repository: SpokenLanguagesRepositoryPort,
    private readonly cache: CacheService,
  ) {}

  async findAllActiveLanguages(): Promise<SpokenLanguage[]> {
    const cached = await this.cache.get<SpokenLanguage[]>(SPOKEN_LANGUAGES_ALL_KEY);
    if (cached) return cached;

    const languages = await this.repository.findAllActive();
    await this.cache.set(SPOKEN_LANGUAGES_ALL_KEY, languages, SPOKEN_LANGUAGES_TTL);
    return languages;
  }

  async searchLanguagesByName(
    searchQuery: string,
    limit: number = APP_CONFIG.SEARCH_AUTOCOMPLETE_LIMIT,
  ): Promise<SpokenLanguage[]> {
    return this.repository.searchByName(searchQuery, limit);
  }

  async findLanguageByCode(code: string): Promise<SpokenLanguage | null> {
    const key = `${SPOKEN_LANGUAGES_BY_CODE_PREFIX}${code}`;
    const cached = await this.cache.get<SpokenLanguage | null>(key);
    if (cached !== null && cached !== undefined) return cached;

    const language = await this.repository.findByCode(code);
    if (language) await this.cache.set(key, language, SPOKEN_LANGUAGES_TTL);
    return language;
  }
}
