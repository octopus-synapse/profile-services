/**
 * Tech Skill Query Service
 * Handles cached queries for tech skills.
 */

import { Injectable } from '@nestjs/common';
import { SkillQueryPort } from '../application/ports/query-facade.ports';
import { CachePort, TechSkillRepositoryPort } from '../application/ports/tech-skills.port';
import type { TechSkill } from '../dto';
import { type SkillType, TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../interfaces';

@Injectable()
export class SkillQueryService extends SkillQueryPort {
  constructor(
    private readonly repository: TechSkillRepositoryPort,
    private readonly cache: CachePort,
  ) {
    super();
  }

  async getAllSkills(): Promise<TechSkill[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.SKILLS_LIST;

    const cached = await this.cache.get<TechSkill[]>(cacheKey);
    if (cached) return cached;

    const result = await this.repository.findAllActive();
    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.SKILLS_LIST);
    return result;
  }

  async getSkillsByNiche(nicheSlug: string): Promise<TechSkill[]> {
    const cacheKey = `${TECH_SKILLS_CACHE_KEYS.SKILLS_BY_NICHE}${nicheSlug}`;

    const cached = await this.cache.get<TechSkill[]>(cacheKey);
    if (cached) return cached;

    const result = await this.repository.findByNiche(nicheSlug);
    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.SKILLS_BY_NICHE);
    return result;
  }

  async getSkillsByType(type: SkillType, limit = 50): Promise<TechSkill[]> {
    const validTypes = [
      'LANGUAGE',
      'FRAMEWORK',
      'LIBRARY',
      'DATABASE',
      'TOOL',
      'PLATFORM',
      'METHODOLOGY',
      'SOFT_SKILL',
      'CERTIFICATION',
      'OTHER',
    ];
    if (!validTypes.includes(type)) {
      return [];
    }

    return this.repository.findByType(type, limit);
  }
}
