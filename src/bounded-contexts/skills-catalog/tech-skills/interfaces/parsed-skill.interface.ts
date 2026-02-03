/**
 * Parsed Skill Types
 * Types for parsed language and skill data from external sources
 */

import type { SkillType } from './tech-skill-types.interface';

export interface ParsedLanguage {
  slug: string;
  nameEn: string;
  namePtBr: string;
  color: string | null;
  extensions: string[];
  aliases: string[];
  paradigms: string[];
  typing: string | null;
  website: string | null;
  popularity: number;
}

export interface ParsedSkill {
  slug: string;
  nameEn: string;
  namePtBr: string;
  type: SkillType;
  nicheSlug: string | null;
  color: string | null;
  icon: string | null;
  website: string | null;
  aliases: string[];
  keywords: string[];
  popularity: number;
}
