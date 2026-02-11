/**
 * Tech Skills Interfaces
 * Re-exports for backward compatibility
 * @deprecated Import from specific interface files instead
 */

// Cache configuration
export { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from './cache.config';
// GitHub Linguist types
export type {
  GithubLanguage,
  GithubLanguagesYml,
} from './github-linguist.interface';
// Parsed data types
export type { ParsedLanguage, ParsedSkill } from './parsed-skill.interface';
// Stack Overflow types
export type {
  StackOverflowResponse,
  StackOverflowTag,
} from './stackoverflow.interface';

// Sync result
export type { TechSkillsSyncResult } from './sync-result.interface';
// Skill type enums
export type { SkillType, TechAreaType } from './tech-skill-types.interface';
