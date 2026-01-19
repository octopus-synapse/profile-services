/**
 * Tech Skills Repository
 * Encapsulates all Prisma operations for the tech-skills module
 *
 * Decision: Repository pattern separates data access concerns from business logic,
 * enabling testability and maintaining inward dependency direction.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { SkillType, TechAreaType } from '../interfaces';
import type { TechSkillRawQueryResult } from '../dtos';

const NICHE_SELECT = { slug: true, nameEn: true, namePtBr: true } as const;

const AREA_SELECT = {
  id: true,
  type: true,
  nameEn: true,
  namePtBr: true,
  descriptionEn: true,
  descriptionPtBr: true,
  icon: true,
  color: true,
  order: true,
} as const;

const LANGUAGE_SELECT = {
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
} as const;

@Injectable()
export class TechSkillsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Tech Area Queries
  // ─────────────────────────────────────────────────────────────────────────────

  async findAllActiveAreas() {
    return this.prisma.techArea.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: AREA_SELECT,
    });
  }

  async findAreaByType(type: TechAreaType) {
    return this.prisma.techArea.findUnique({
      where: { type },
    });
  }

  async upsertArea(area: {
    type: TechAreaType;
    nameEn: string;
    namePtBr: string;
    descriptionEn: string;
    descriptionPtBr: string;
    icon: string;
    color: string;
    order: number;
  }) {
    return this.prisma.techArea.upsert({
      where: { type: area.type },
      create: area,
      update: {
        nameEn: area.nameEn,
        namePtBr: area.namePtBr,
        descriptionEn: area.descriptionEn,
        descriptionPtBr: area.descriptionPtBr,
        icon: area.icon,
        color: area.color,
        order: area.order,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tech Niche Queries
  // ─────────────────────────────────────────────────────────────────────────────

  async findAllActiveNichesWithArea() {
    return this.prisma.techNiche.findMany({
      where: { isActive: true },
      orderBy: [{ area: { order: 'asc' } }, { order: 'asc' }],
      include: {
        area: { select: { type: true } },
      },
    });
  }

  async findActiveNichesByAreaType(areaType: TechAreaType) {
    return this.prisma.techNiche.findMany({
      where: {
        isActive: true,
        area: { type: areaType },
      },
      orderBy: { order: 'asc' },
      include: {
        area: { select: { type: true } },
      },
    });
  }

  async findNicheBySlug(slug: string) {
    return this.prisma.techNiche.findUnique({
      where: { slug },
    });
  }

  async upsertNiche(niche: {
    slug: string;
    nameEn: string;
    namePtBr: string;
    descriptionEn: string;
    descriptionPtBr: string;
    icon: string;
    color: string;
    order: number;
    areaId: string;
  }) {
    return this.prisma.techNiche.upsert({
      where: { slug: niche.slug },
      create: niche,
      update: {
        nameEn: niche.nameEn,
        namePtBr: niche.namePtBr,
        descriptionEn: niche.descriptionEn,
        descriptionPtBr: niche.descriptionPtBr,
        icon: niche.icon,
        color: niche.color,
        order: niche.order,
        areaId: niche.areaId,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tech Skill Queries
  // ─────────────────────────────────────────────────────────────────────────────

  async findAllActiveSkillsWithNiche() {
    return this.prisma.techSkill.findMany({
      where: { isActive: true },
      orderBy: { popularity: 'desc' },
      include: { niche: { select: NICHE_SELECT } },
    });
  }

  async findActiveSkillsByNicheSlug(nicheSlug: string) {
    return this.prisma.techSkill.findMany({
      where: { isActive: true, niche: { slug: nicheSlug } },
      orderBy: { popularity: 'desc' },
      include: { niche: { select: NICHE_SELECT } },
    });
  }

  async findActiveSkillsByType(type: SkillType, limit: number) {
    return this.prisma.techSkill.findMany({
      where: { isActive: true, type },
      take: limit,
      orderBy: { popularity: 'desc' },
      include: { niche: { select: NICHE_SELECT } },
    });
  }

  async findSkillBySlug(slug: string) {
    return this.prisma.techSkill.findUnique({
      where: { slug },
    });
  }

  async createSkill(data: {
    slug: string;
    nameEn: string;
    namePtBr: string;
    type: SkillType;
    nicheId?: string;
    color?: string | null;
    icon?: string | null;
    website?: string | null;
    aliases?: string[];
    keywords?: string[];
    popularity: number;
  }) {
    return this.prisma.techSkill.create({
      data: {
        slug: data.slug,
        nameEn: data.nameEn,
        namePtBr: data.namePtBr,
        type: data.type,
        color: data.color,
        icon: data.icon,
        website: data.website,
        aliases: data.aliases,
        keywords: data.keywords,
        popularity: data.popularity,
        ...(data.nicheId && { niche: { connect: { id: data.nicheId } } }),
      },
    });
  }

  async updateSkillBySlug(
    slug: string,
    data: {
      nameEn: string;
      namePtBr: string;
      type: SkillType;
      nicheId?: string;
      color?: string | null;
      icon?: string | null;
      website?: string | null;
      aliases?: string[];
      keywords?: string[];
      popularity: number;
    },
  ) {
    return this.prisma.techSkill.update({
      where: { slug },
      data: {
        nameEn: data.nameEn,
        namePtBr: data.namePtBr,
        type: data.type,
        color: data.color,
        icon: data.icon,
        website: data.website,
        aliases: data.aliases,
        keywords: data.keywords,
        popularity: data.popularity,
        ...(data.nicheId !== undefined && {
          niche: data.nicheId
            ? { connect: { id: data.nicheId } }
            : { disconnect: true },
        }),
      },
    });
  }

  async searchSkillsRaw(
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Programming Language Queries
  // ─────────────────────────────────────────────────────────────────────────────

  async findAllActiveLanguages() {
    return this.prisma.programmingLanguage.findMany({
      where: { isActive: true },
      orderBy: { popularity: 'desc' },
      select: LANGUAGE_SELECT,
    });
  }

  async findLanguageBySlug(slug: string) {
    return this.prisma.programmingLanguage.findUnique({
      where: { slug },
    });
  }

  async createLanguage(data: {
    slug: string;
    nameEn: string;
    namePtBr: string;
    color?: string | null;
    website?: string | null;
    aliases?: string[];
    fileExtensions?: string[];
    paradigms?: string[];
    typing?: string | null;
    popularity: number;
  }) {
    return this.prisma.programmingLanguage.create({ data });
  }

  async updateLanguageBySlug(
    slug: string,
    data: {
      nameEn: string;
      namePtBr: string;
      color?: string | null;
      website?: string | null;
      aliases?: string[];
      fileExtensions?: string[];
      paradigms?: string[];
      typing?: string | null;
      popularity: number;
    },
  ) {
    return this.prisma.programmingLanguage.update({
      where: { slug },
      data,
    });
  }

  async searchLanguagesRaw(query: string, limit: number) {
    return this.prisma.$queryRaw<
      {
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
      }[]
    >`
      SELECT 
        id, slug, "nameEn", "namePtBr", color, website,
        aliases, "fileExtensions", paradigms, typing, popularity
      FROM "ProgrammingLanguage"
      WHERE "isActive" = true
        AND (
          immutable_unaccent(lower("nameEn")) LIKE '%' || immutable_unaccent(lower(${query})) || '%'
          OR immutable_unaccent(lower("namePtBr")) LIKE '%' || immutable_unaccent(lower(${query})) || '%'
          OR slug LIKE '%' || ${query} || '%'
          OR ${query} = ANY(aliases)
        )
      ORDER BY popularity DESC
      LIMIT ${limit}
    `;
  }
}
