/**
 * Skill Mapper Utility
 * Maps Prisma skills to DTO format
 */

import type { SkillType } from '../interfaces';
import type { TechSkillDto, TechSkillRawQueryResult } from '../dtos';

/** Prisma skill with niche relation */
export interface PrismaSkillWithNiche {
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
  niche: { slug: string; nameEn: string; namePtBr: string } | null;
}

/**
 * Map Prisma skills to DTO format
 */
export function mapSkillsToDto(skills: PrismaSkillWithNiche[]): TechSkillDto[] {
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
 * Map raw SQL query results to DTO format
 */
export function mapRawSkillsToDto(
  skills: TechSkillRawQueryResult[],
): TechSkillDto[] {
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
    niche: s.niche_slug
      ? {
          slug: s.niche_slug,
          nameEn: s.niche_nameEn!,
          namePtBr: s.niche_namePtBr!,
        }
      : null,
  }));
}
