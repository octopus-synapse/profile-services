/**
 * Skill Search Service
 * Handles skill search with caching
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { API_LIMITS } from '@/shared-kernel';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../interfaces';
import type { TechSkill, TechSkillRawQueryResult } from '../dtos';
import { mapRawSkillsTo } from '../utils';

@Injectable()
export class SkillSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Search skills with accent-insensitive matching */
  async searchSkills(query: string, limit = 20): Promise<TechSkill[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery.length < 1) return [];

    const cacheKey = this.buildCacheKey(normalizedQuery);

    const cached = await this.cache.get<TechSkill[]>(cacheKey);
    if (cached) return cached;

    const skills = await this.executeSearchQuery(normalizedQuery, limit);
    const result = mapRawSkillsTo(skills);

    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.SKILLS_SEARCH);
    return result;
  }

  private buildCacheKey(query: string): string {
    const queryHash = crypto
      .createHash('md5')
      .update(`skill:${query}`)
      .digest('hex')
      .slice(0, API_LIMITS.MAX_SUGGESTIONS);
    return `${TECH_SKILLS_CACHE_KEYS.SKILLS_SEARCH}${queryHash}`;
  }

  private async executeSearchQuery(
    query: string,
    limit: number,
  ): Promise<TechSkillRawQueryResult[]> {
    return this.prisma.$queryRaw<TechSkillRawQueryResult[]>`
      SELECT 
        s.id, s.slug, s."nameEn", s."namePtBr", s.type,
        s.icon, s.color, s.website, s.aliases, s.popularity,
        n.slug as niche_slug,
        n."nameEn" as "niche_nameEn",
        n."namePtBr" as "niche_namePtBr"
      FROM "TechSkill" s
      LEFT JOIN "TechNiche" n ON s."nicheId" = n.id
      WHERE s."isActive" = true
        AND (
          immutable_unaccent(lower(s."nameEn")) LIKE '%' || immutable_unaccent(lower(${query})) || '%'
          OR immutable_unaccent(lower(s."namePtBr")) LIKE '%' || immutable_unaccent(lower(${query})) || '%'
          OR s.slug LIKE '%' || ${query} || '%'
          OR ${query} = ANY(s.aliases)
          OR ${query} = ANY(s.keywords)
        )
      ORDER BY s.popularity DESC
      LIMIT ${limit}
    `;
  }
}
