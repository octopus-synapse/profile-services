/**
 * Programming Language Query Service
 * Handles cached queries for programming languages
 */

import * as crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { API_LIMITS } from '@/shared-kernel';
import type { ProgrammingLanguage } from '../dtos';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../interfaces';

@Injectable()
export class LanguageQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get all programming languages
   */
  async getAllLanguages(): Promise<ProgrammingLanguage[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.LANGUAGES_LIST;

    const cached = await this.cache.get<ProgrammingLanguage[]>(cacheKey);
    if (cached) return cached;

    const languages = await this.prisma.programmingLanguage.findMany({
      where: { isActive: true },
      orderBy: { popularity: 'desc' },
      select: {
        id: true,
        slug: true,
        nameEn: true,
        namePtBr: true,
        color: true,
        website: true,
        aliases: true,
        fileExtensions: true,
        paradigms: true,
        typing: true,
        popularity: true,
      },
    });

    await this.cache.set(cacheKey, languages, TECH_SKILLS_CACHE_TTL.LANGUAGES_LIST);
    return languages;
  }

  /**
   * Search programming languages with accent-insensitive matching
   */
  async searchLanguages(query: string, limit = 20): Promise<ProgrammingLanguage[]> {
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

    const languages = await this.prisma.$queryRaw<ProgrammingLanguage[]>`
      SELECT 
        id, slug, "nameEn", "namePtBr", color, website,
        aliases, "fileExtensions", paradigms, typing, popularity
      FROM "ProgrammingLanguage"
      WHERE "isActive" = true
        AND (
          immutable_unaccent(lower("nameEn")) LIKE '%' || immutable_unaccent(lower(${normalizedQuery})) || '%'
          OR immutable_unaccent(lower("namePtBr")) LIKE '%' || immutable_unaccent(lower(${normalizedQuery})) || '%'
          OR slug LIKE '%' || ${normalizedQuery} || '%'
          OR ${normalizedQuery} = ANY(aliases)
        )
      ORDER BY popularity DESC
      LIMIT ${limit}
    `;

    await this.cache.set(cacheKey, languages, TECH_SKILLS_CACHE_TTL.SKILLS_SEARCH);
    return languages;
  }
}
