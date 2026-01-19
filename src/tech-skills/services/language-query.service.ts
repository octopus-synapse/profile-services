/**
 * Programming Language Query Service
 * Handles cached queries for programming languages
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { CacheService } from '../../common/cache/cache.service';
import { API_LIMITS } from '@octopus-synapse/profile-contracts';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../interfaces';
import { TechSkillsRepository } from '../repositories';
import type { ProgrammingLanguage } from '../dtos';

@Injectable()
export class LanguageQueryService {
  constructor(
    private readonly techSkillsRepo: TechSkillsRepository,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get all programming languages
   */
  async getAllLanguages(): Promise<ProgrammingLanguage[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.LANGUAGES_LIST;

    const cached = await this.cache.get<ProgrammingLanguage[]>(cacheKey);
    if (cached) return cached;

    const languages = await this.techSkillsRepo.findAllActiveLanguages();

    await this.cache.set(
      cacheKey,
      languages,
      TECH_SKILLS_CACHE_TTL.LANGUAGES_LIST,
    );
    return languages;
  }

  /**
   * Search programming languages with accent-insensitive matching
   */
  async searchLanguages(
    query: string,
    limit = 20,
  ): Promise<ProgrammingLanguage[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery.length < 1) return [];

    const queryHash = crypto
      .createHash('md5')
      .update(`lang:${normalizedQuery}`)
      .digest('hex')
      .slice(0, API_LIMITS.MAX_SUGGESTIONS);
    const cacheKey = `${TECH_SKILLS_CACHE_KEYS.SKILLS_SEARCH}${queryHash}`;

    const cached = await this.cache.get<ProgrammingLanguage[]>(cacheKey);
    if (cached) return cached;

    const languages = await this.techSkillsRepo.searchLanguagesRaw(
      normalizedQuery,
      limit,
    );

    await this.cache.set(
      cacheKey,
      languages,
      TECH_SKILLS_CACHE_TTL.SKILLS_SEARCH,
    );
    return languages;
  }
}
