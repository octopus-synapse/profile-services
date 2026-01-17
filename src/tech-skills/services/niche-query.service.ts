/**
 * Tech Niche Query Service
 * Handles cached queries for tech niches
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';
import {
  TECH_SKILLS_CACHE_KEYS,
  TECH_SKILLS_CACHE_TTL,
  type TechAreaType,
} from '../interfaces';
import { TechSkillsRepository } from '../repositories';
import type { TechNiche } from '../dtos';

@Injectable()
export class TechNicheQueryService {
  constructor(
    private readonly techSkillsRepo: TechSkillsRepository,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get all niches
   */
  async getAllNiches(): Promise<TechNiche[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.NICHES_LIST;

    const cached = await this.cache.get<TechNiche[]>(cacheKey);
    if (cached) return cached;

    const niches = await this.techSkillsRepo.findAllActiveNichesWithArea();

    const result: TechNiche[] = niches.map((n) => ({
      id: n.id,
      slug: n.slug,
      nameEn: n.nameEn,
      namePtBr: n.namePtBr,
      descriptionEn: n.descriptionEn,
      descriptionPtBr: n.descriptionPtBr,
      icon: n.icon,
      color: n.color,
      order: n.order,
      areaType: n.area.type as TechAreaType,
    }));

    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.NICHES_LIST);
    return result;
  }

  /**
   * Get niches by area type
   */
  async getNichesByArea(areaType: TechAreaType): Promise<TechNiche[]> {
    const cacheKey = `${TECH_SKILLS_CACHE_KEYS.SKILLS_BY_AREA}${areaType}`;

    const cached = await this.cache.get<TechNiche[]>(cacheKey);
    if (cached) return cached;

    const niches =
      await this.techSkillsRepo.findActiveNichesByAreaType(areaType);

    const result: TechNiche[] = niches.map((n) => ({
      id: n.id,
      slug: n.slug,
      nameEn: n.nameEn,
      namePtBr: n.namePtBr,
      descriptionEn: n.descriptionEn,
      descriptionPtBr: n.descriptionPtBr,
      icon: n.icon,
      color: n.color,
      order: n.order,
      areaType: n.area.type as TechAreaType,
    }));

    await this.cache.set(
      cacheKey,
      result,
      TECH_SKILLS_CACHE_TTL.SKILLS_BY_AREA,
    );
    return result;
  }
}
