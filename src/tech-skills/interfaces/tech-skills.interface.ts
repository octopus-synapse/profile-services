/**
 * Tech Skills Interfaces
 * Types for tech skills synchronization
 */

// GitHub Linguist language structure
export interface GithubLanguage {
  type: 'programming' | 'data' | 'markup' | 'prose';
  color?: string;
  extensions?: string[];
  filenames?: string[];
  aliases?: string[];
  interpreters?: string[];
  tm_scope?: string;
  ace_mode?: string;
  codemirror_mode?: string;
  codemirror_mime_type?: string;
  language_id?: number;
  group?: string;
  wrap?: boolean;
}

export interface GithubLanguagesYml {
  [name: string]: GithubLanguage;
}

// Stack Overflow tag structure
export interface StackOverflowTag {
  name: string;
  count: number;
  has_synonyms: boolean;
  is_moderator_only: boolean;
  is_required: boolean;
}

export interface StackOverflowResponse {
  items: StackOverflowTag[];
  has_more: boolean;
  quota_max: number;
  quota_remaining: number;
}

// Tech area types
export type TechAreaType =
  | 'DEVELOPMENT'
  | 'DEVOPS'
  | 'DATA'
  | 'SECURITY'
  | 'DESIGN'
  | 'PRODUCT'
  | 'QA'
  | 'INFRASTRUCTURE'
  | 'OTHER';

export type SkillType =
  | 'LANGUAGE'
  | 'FRAMEWORK'
  | 'LIBRARY'
  | 'DATABASE'
  | 'TOOL'
  | 'PLATFORM'
  | 'METHODOLOGY'
  | 'SOFT_SKILL'
  | 'CERTIFICATION'
  | 'OTHER';

// Parsed skill data
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

// Sync result
export interface TechSkillsSyncResult {
  languagesInserted: number;
  languagesUpdated: number;
  skillsInserted: number;
  skillsUpdated: number;
  areasCreated: number;
  nichesCreated: number;
  errors: string[];
}

// Cache keys
export const TECH_SKILLS_CACHE_KEYS = {
  LANGUAGES_LIST: 'tech:languages:list',
  SKILLS_LIST: 'tech:skills:list',
  SKILLS_BY_NICHE: 'tech:skills:niche:',
  SKILLS_BY_AREA: 'tech:skills:area:',
  SKILLS_SEARCH: 'tech:skills:search:',
  NICHES_LIST: 'tech:niches:list',
  AREAS_LIST: 'tech:areas:list',
};

export const TECH_SKILLS_CACHE_TTL = {
  LANGUAGES_LIST: 86400, // 24 hours
  SKILLS_LIST: 86400,
  SKILLS_BY_NICHE: 86400,
  SKILLS_BY_AREA: 86400,
  SKILLS_SEARCH: 3600, // 1 hour
  NICHES_LIST: 86400,
  AREAS_LIST: 86400,
};
