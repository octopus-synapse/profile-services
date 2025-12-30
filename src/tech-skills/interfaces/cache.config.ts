/**
 * Tech Skills Cache Configuration
 * Cache keys and TTL values for tech skills module
 */

export const TECH_SKILLS_CACHE_KEYS = {
  LANGUAGES_LIST: 'tech:languages:list',
  SKILLS_LIST: 'tech:skills:list',
  SKILLS_BY_NICHE: 'tech:skills:niche:',
  SKILLS_BY_AREA: 'tech:skills:area:',
  SKILLS_SEARCH: 'tech:skills:search:',
  NICHES_LIST: 'tech:niches:list',
  AREAS_LIST: 'tech:areas:list',
} as const;

export const TECH_SKILLS_CACHE_TTL = {
  LANGUAGES_LIST: 86400, // 24 hours
  SKILLS_LIST: 86400,
  SKILLS_BY_NICHE: 86400,
  SKILLS_BY_AREA: 86400,
  SKILLS_SEARCH: 3600, // 1 hour
  NICHES_LIST: 86400,
  AREAS_LIST: 86400,
} as const;
