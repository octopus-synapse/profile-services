/**
 * Skill Search Service
 * Handles skill search with caching
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { CacheService } from '../../common/cache/cache.service';
import { API_LIMITS } from '@octopus-synapse/profile-contracts';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../interfaces';
import { TechSkillsRepository } from '../repositories';
import type { TechSkill } from '../dtos';
import { mapRawSkillsTo } from '../utils';

@Injectable()
export class SkillSearchService {
  constructor(
    private readonly techSkillsRepo: TechSkillsRepository,
    private readonly cache: CacheService,
  ) {}

  /** Search skills with accent-insensitive matching */
  async searchSkills(query: string, limit = 20): Promise<TechSkill[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery.length < 1) return [];

    const cacheKey = this.buildCacheKey(normalizedQuery);

    const cached = await this.cache.get<TechSkill[]>(cacheKey);
    if (cached) return cached;

    const skills = await this.techSkillsRepo.searchSkillsRaw(
      normalizedQuery,
      limit,
    );
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
}
