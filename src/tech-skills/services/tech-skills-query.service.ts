/**
 * Tech Skills Query Service
 * Provides cached queries for tech skills, languages, areas, and niches
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from '../interfaces';
import type { TechAreaType, SkillType } from '../interfaces';
import * as crypto from 'crypto';

// DTOs for frontend consumption
export interface TechAreaDto {
  id: string;
  type: TechAreaType;
  nameEn: string;
  namePtBr: string;
  descriptionEn: string | null;
  descriptionPtBr: string | null;
  icon: string | null;
  color: string | null;
  order: number;
}

export interface TechNicheDto {
  id: string;
  slug: string;
  nameEn: string;
  namePtBr: string;
  descriptionEn: string | null;
  descriptionPtBr: string | null;
  icon: string | null;
  color: string | null;
  order: number;
  areaType: TechAreaType;
}

export interface TechSkillDto {
  id: string;
  slug: string;
  nameEn: string;
  namePtBr: string;
  type: SkillType;
  icon: string | null;
  color: string | null;
  website: string | null;
  aliases: string[];
  popularity: number;
  niche: {
    slug: string;
    nameEn: string;
    namePtBr: string;
  } | null;
}

export interface ProgrammingLanguageDto {
  id: string;
  slug: string;
  nameEn: string;
  namePtBr: string;
  color: string | null;
  website: string | null;
  aliases: string[];
  fileExtensions: string[];
  paradigms: string[];
  typing: string | null;
  popularity: number;
}

@Injectable()
export class TechSkillsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly logger: AppLoggerService,
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
        area: {
          select: { type: true },
        },
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
   * Get niches by area
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
        area: {
          select: { type: true },
        },
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

  /**
   * Get all programming languages
   */
  async getAllLanguages(): Promise<ProgrammingLanguageDto[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.LANGUAGES_LIST;

    const cached = await this.cache.get<ProgrammingLanguageDto[]>(cacheKey);
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

    await this.cache.set(
      cacheKey,
      languages,
      TECH_SKILLS_CACHE_TTL.LANGUAGES_LIST,
    );
    return languages;
  }

  /**
   * Search programming languages
   */
  async searchLanguages(
    query: string,
    limit = 20,
  ): Promise<ProgrammingLanguageDto[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery.length < 1) return [];

    const queryHash = crypto
      .createHash('md5')
      .update(`lang:${normalizedQuery}`)
      .digest('hex')
      .slice(0, 8);
    const cacheKey = `${TECH_SKILLS_CACHE_KEYS.SKILLS_SEARCH}${queryHash}`;

    const cached = await this.cache.get<ProgrammingLanguageDto[]>(cacheKey);
    if (cached) return cached;

    // Search using unaccent for accent-insensitive search
    const languages = await this.prisma.$queryRaw<ProgrammingLanguageDto[]>`
      SELECT 
        id,
        slug,
        "nameEn",
        "namePtBr",
        color,
        website,
        aliases,
        "fileExtensions",
        paradigms,
        typing,
        popularity
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

    await this.cache.set(
      cacheKey,
      languages,
      TECH_SKILLS_CACHE_TTL.SKILLS_SEARCH,
    );
    return languages;
  }

  /**
   * Get all skills
   */
  async getAllSkills(): Promise<TechSkillDto[]> {
    const cacheKey = TECH_SKILLS_CACHE_KEYS.SKILLS_LIST;

    const cached = await this.cache.get<TechSkillDto[]>(cacheKey);
    if (cached) return cached;

    const skills = await this.prisma.techSkill.findMany({
      where: { isActive: true },
      orderBy: { popularity: 'desc' },
      include: {
        niche: {
          select: {
            slug: true,
            nameEn: true,
            namePtBr: true,
          },
        },
      },
    });

    const result: TechSkillDto[] = skills.map((s) => ({
      id: s.id,
      slug: s.slug,
      nameEn: s.nameEn,
      namePtBr: s.namePtBr,
      type: s.type as SkillType,
      icon: s.icon,
      color: s.color,
      website: s.website,
      aliases: s.aliases,
      popularity: s.popularity,
      niche: s.niche,
    }));

    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.SKILLS_LIST);
    return result;
  }

  /**
   * Get skills by niche
   */
  async getSkillsByNiche(nicheSlug: string): Promise<TechSkillDto[]> {
    const cacheKey = `${TECH_SKILLS_CACHE_KEYS.SKILLS_BY_NICHE}${nicheSlug}`;

    const cached = await this.cache.get<TechSkillDto[]>(cacheKey);
    if (cached) return cached;

    const skills = await this.prisma.techSkill.findMany({
      where: {
        isActive: true,
        niche: { slug: nicheSlug },
      },
      orderBy: { popularity: 'desc' },
      include: {
        niche: {
          select: {
            slug: true,
            nameEn: true,
            namePtBr: true,
          },
        },
      },
    });

    const result: TechSkillDto[] = skills.map((s) => ({
      id: s.id,
      slug: s.slug,
      nameEn: s.nameEn,
      namePtBr: s.namePtBr,
      type: s.type as SkillType,
      icon: s.icon,
      color: s.color,
      website: s.website,
      aliases: s.aliases,
      popularity: s.popularity,
      niche: s.niche,
    }));

    await this.cache.set(
      cacheKey,
      result,
      TECH_SKILLS_CACHE_TTL.SKILLS_BY_NICHE,
    );
    return result;
  }

  /**
   * Get skills by type
   */
  async getSkillsByType(type: SkillType, limit = 50): Promise<TechSkillDto[]> {
    const skills = await this.prisma.techSkill.findMany({
      where: {
        isActive: true,
        type,
      },
      take: limit,
      orderBy: { popularity: 'desc' },
      include: {
        niche: {
          select: {
            slug: true,
            nameEn: true,
            namePtBr: true,
          },
        },
      },
    });

    return skills.map((s) => ({
      id: s.id,
      slug: s.slug,
      nameEn: s.nameEn,
      namePtBr: s.namePtBr,
      type: s.type as SkillType,
      icon: s.icon,
      color: s.color,
      website: s.website,
      aliases: s.aliases,
      popularity: s.popularity,
      niche: s.niche,
    }));
  }

  /**
   * Search skills
   */
  async searchSkills(query: string, limit = 20): Promise<TechSkillDto[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery.length < 1) return [];

    const queryHash = crypto
      .createHash('md5')
      .update(`skill:${normalizedQuery}`)
      .digest('hex')
      .slice(0, 8);
    const cacheKey = `${TECH_SKILLS_CACHE_KEYS.SKILLS_SEARCH}${queryHash}`;

    const cached = await this.cache.get<TechSkillDto[]>(cacheKey);
    if (cached) return cached;

    // Search using unaccent for accent-insensitive search
    const skills = await this.prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        nameEn: string;
        namePtBr: string;
        type: string;
        icon: string | null;
        color: string | null;
        website: string | null;
        aliases: string[];
        popularity: number;
        niche_slug: string | null;
        niche_nameEn: string | null;
        niche_namePtBr: string | null;
      }>
    >`
      SELECT 
        s.id,
        s.slug,
        s."nameEn",
        s."namePtBr",
        s.type,
        s.icon,
        s.color,
        s.website,
        s.aliases,
        s.popularity,
        n.slug as niche_slug,
        n."nameEn" as "niche_nameEn",
        n."namePtBr" as "niche_namePtBr"
      FROM "TechSkill" s
      LEFT JOIN "TechNiche" n ON s."nicheId" = n.id
      WHERE s."isActive" = true
        AND (
          immutable_unaccent(lower(s."nameEn")) LIKE '%' || immutable_unaccent(lower(${normalizedQuery})) || '%'
          OR immutable_unaccent(lower(s."namePtBr")) LIKE '%' || immutable_unaccent(lower(${normalizedQuery})) || '%'
          OR s.slug LIKE '%' || ${normalizedQuery} || '%'
          OR ${normalizedQuery} = ANY(s.aliases)
          OR ${normalizedQuery} = ANY(s.keywords)
        )
      ORDER BY s.popularity DESC
      LIMIT ${limit}
    `;

    const result: TechSkillDto[] = skills.map((s) => ({
      id: s.id,
      slug: s.slug,
      nameEn: s.nameEn,
      namePtBr: s.namePtBr,
      type: s.type as SkillType,
      icon: s.icon,
      color: s.color,
      website: s.website,
      aliases: s.aliases,
      popularity: s.popularity,
      niche: s.niche_slug
        ? {
            slug: s.niche_slug,
            nameEn: s.niche_nameEn!,
            namePtBr: s.niche_namePtBr!,
          }
        : null,
    }));

    await this.cache.set(cacheKey, result, TECH_SKILLS_CACHE_TTL.SKILLS_SEARCH);
    return result;
  }

  /**
   * Combined search for languages and skills
   */
  async searchAll(
    query: string,
    limit = 20,
  ): Promise<{
    languages: ProgrammingLanguageDto[];
    skills: TechSkillDto[];
  }> {
    const [languages, skills] = await Promise.all([
      this.searchLanguages(query, Math.floor(limit / 2)),
      this.searchSkills(query, Math.floor(limit / 2)),
    ]);

    return { languages, skills };
  }
}
