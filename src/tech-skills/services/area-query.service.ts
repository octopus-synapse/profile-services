/**
 * Tech Area Query Service
 * Handles cached queries for tech areas
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../interfaces';
import type { TechAreaDto } from '../dtos';

@Injectable()
export class TechAreaQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get all tech areas
   */
  async getAllAreas(): Promise<TechAreaDto[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.AREAS_LIST;

    const cached = await this.cache.get<TechAreaDto[]>(cacheKey);
    if (cached) return cached;

    const areas = await this.prisma.techArea.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        type: true,
        nameEn: true,
        namePtBr: true,
        descriptionEn: true,
        descriptionPtBr: true,
        icon: true,
        color: true,
        order: true,
      },
    });

    await this.cache.set(cacheKey, areas, TECH_SKILLS_CACHE_TTL.AREAS_LIST);
    return areas as TechAreaDto[];
  }
}
