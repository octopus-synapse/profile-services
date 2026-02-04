/**
 * Tech Skill Query Service
 * Handles cached queries for tech skills
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import {
  TECH_SKILLS_CACHE_KEYS,
  TECH_SKILLS_CACHE_TTL,
  type SkillType,
} from '../interfaces';
import type { TechSkill } from '../dtos';
import { mapSkillsTo } from '../utils';

const NICHE_SELECT = { slug: true, nameEn: true, namePtBr: true } as const;

@Injectable()
export class SkillQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Get all skills */
  async getAllSkills(): Promise<TechSkill[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.SKILLS_LIST;

    const cached = await this.cache.get<TechSkill[]>(cacheKey);
    if (cached) return cached;

    const skills = await this.prisma.techSkill.findMany({
      where: { isActive: true },
      orderBy: { popularity: 'desc' },
      include: { niche: { select: NICHE_SELECT } },
    });

    const result = mapSkillsTo(skills);
    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.SKILLS_LIST);
    return result;
  }

  /** Get skills by niche slug */
  async getSkillsByNiche(nicheSlug: string): Promise<TechSkill[]> {
    const cacheKey = `${TECH_SKILLS_CACHE_KEYS.SKILLS_BY_NICHE}${nicheSlug}`;

    const cached = await this.cache.get<TechSkill[]>(cacheKey);
    if (cached) return cached;

    const skills = await this.prisma.techSkill.findMany({
      where: { isActive: true, niche: { slug: nicheSlug } },
      orderBy: { popularity: 'desc' },
      include: { niche: { select: NICHE_SELECT } },
    });

    const result = mapSkillsTo(skills);
    await this.cache.set(
      cacheKey,
      result,
      TECH_SKILLS_CACHE_TTL.SKILLS_BY_NICHE,
    );
    return result;
  }

  /** Get skills by type */
  async getSkillsByType(type: SkillType, limit = 50): Promise<TechSkill[]> {
    const skills = await this.prisma.techSkill.findMany({
      where: { isActive: true, type },
      take: limit,
      orderBy: { popularity: 'desc' },
      include: { niche: { select: NICHE_SELECT } },
    });

    return mapSkillsTo(skills);
  }
}
