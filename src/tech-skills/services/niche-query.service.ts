/**
 * Tech Niche Query Service
 * Handles cached queries for tech niches
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import {
  TECH_SKILLS_CACHE_KEYS,
  TECH_SKILLS_CACHE_TTL,
  type TechAreaType,
} from '../interfaces';
import type { TechNicheDto } from '../dtos';

@Injectable()
export class TechNicheQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get all niches
   */
  async getAllNiches(): Promise<TechNicheDto[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.NICHES_LIST;

    const cached = await this.cache.get<TechNicheDto[]>(cacheKey);
    if (cached) return cached;

    const niches = await this.prisma.techNiche.findMany({
      where: { isActive: true },
      orderBy: [{ area: { order: 'asc' } }, { order: 'asc' }],
      include: {
        area: { select: { type: true } },
      },
    });

    const result: TechNicheDto[] = niches.map((n) => ({
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
  async getNichesByArea(areaType: TechAreaType): Promise<TechNicheDto[]> {
    const cacheKey = `${TECH_SKILLS_CACHE_KEYS.SKILLS_BY_AREA}${areaType}`;

    const cached = await this.cache.get<TechNicheDto[]>(cacheKey);
    if (cached) return cached;

    const niches = await this.prisma.techNiche.findMany({
      where: {
        isActive: true,
        area: { type: areaType },
      },
      orderBy: { order: 'asc' },
      include: {
        area: { select: { type: true } },
      },
    });

    const result: TechNicheDto[] = niches.map((n) => ({
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
