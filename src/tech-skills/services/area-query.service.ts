/**
 * Tech Area Query Service
 * Handles cached queries for tech areas
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../interfaces';
import { TechSkillsRepository } from '../repositories';
import type { TechArea } from '../dtos';

@Injectable()
export class TechAreaQueryService {
  constructor(
    private readonly techSkillsRepo: TechSkillsRepository,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get all tech areas
   */
  async getAllAreas(): Promise<TechArea[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.AREAS_LIST;

    const cached = await this.cache.get<TechArea[]>(cacheKey);
    if (cached) return cached;

    const areas = await this.techSkillsRepo.findAllActiveAreas();

    await this.cache.set(cacheKey, areas, TECH_SKILLS_CACHE_TTL.AREAS_LIST);
    return areas as TechArea[];
  }
}
