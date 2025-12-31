/**
 * Tech Skills Interfaces
 * Re-exports for backward compatibility
 * @deprecated Import from specific interface files instead
 */

// GitHub Linguist types
export type {
  GithubLanguage,
  GithubLanguagesYml,
} from './github-linguist.interface';

// Stack Overflow types
export type {
  StackOverflowTag,
  StackOverflowResponse,
} from './stackoverflow.interface';

// Skill type enums
export type { TechAreaType, SkillType } from './tech-skill-types.interface';

// Parsed data types
export type { ParsedLanguage, ParsedSkill } from './parsed-skill.interface';

// Sync result
export type { TechSkillsSyncResult } from './sync-result.interface';

// Cache configuration
export { TECH_SKILLS_CACHE_KEYS, TECH_SKILLS_CACHE_TTL } from './cache.config';
