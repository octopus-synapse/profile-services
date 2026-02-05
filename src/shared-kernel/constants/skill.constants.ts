/**
 * Skill Constants
 *
 * Constants related to skill management and levels.
 *
 * NOTE: SkillLevelSchema and SkillLevelToNumeric are defined in domain/enums/skill-level.enum.ts
 * This file re-exports them and provides additional utility mappings.
 */

import { SkillLevel } from '../enums/skill-level.enum';

// Re-export from enums for backward compatibility
export {
  SkillLevelSchema,
  SkillLevelToNumeric,
  type SkillLevel,
} from '../enums/skill-level.enum';

/**
 * Numeric to Skill Level Mapping
 * Reverse mapping for retrieving skill levels from database
 */
export const NumericToSkillLevel: Record<number, SkillLevel> = {
  1: 'BEGINNER',
  2: 'INTERMEDIATE',
  3: 'ADVANCED',
  4: 'EXPERT',
} as const;
