/**
 * Tech Skill DTO
 * Data transfer object for tech skills
 */

import type { SkillType } from '../interfaces';

export interface NicheReferenceDto {
  slug: string;
  nameEn: string;
  namePtBr: string;
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
  niche: NicheReferenceDto | null;
}

/**
 * Raw skill query result from database
 * Used internally for raw SQL queries
 */
export interface TechSkillRawQueryResult {
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
}
