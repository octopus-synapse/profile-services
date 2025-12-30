/**
 * Skill Categories - Aggregated Export
 *
 * Combines all skill category mappings into a single record.
 */

import type { SkillType } from '../interfaces';
import { SKILL_CATEGORIES as FRAMEWORK_CATEGORIES } from './skill-categories-frameworks.const';
import {
  DATABASE_CATEGORIES,
  DEVOPS_CATEGORIES,
} from './skill-categories-infra.const';
import {
  DATA_AI_CATEGORIES,
  TESTING_CATEGORIES,
} from './skill-categories-data.const';
import {
  DESIGN_CATEGORIES,
  SECURITY_CATEGORIES,
  COLLABORATION_CATEGORIES,
} from './skill-categories-tools.const';
import {
  LIBRARY_CATEGORIES,
  METHODOLOGY_CATEGORIES,
  BLOCKCHAIN_CATEGORIES,
  IDE_CATEGORIES,
} from './skill-categories-misc.const';

type SkillCategory = { type: SkillType; niche: string | null };

/**
 * All skill categories combined
 */
export const SKILL_CATEGORIES: Record<string, SkillCategory> = {
  ...FRAMEWORK_CATEGORIES,
  ...DATABASE_CATEGORIES,
  ...DEVOPS_CATEGORIES,
  ...DATA_AI_CATEGORIES,
  ...TESTING_CATEGORIES,
  ...DESIGN_CATEGORIES,
  ...SECURITY_CATEGORIES,
  ...COLLABORATION_CATEGORIES,
  ...LIBRARY_CATEGORIES,
  ...METHODOLOGY_CATEGORIES,
  ...BLOCKCHAIN_CATEGORIES,
  ...IDE_CATEGORIES,
};

// Re-export individual category groups
export {
  FRAMEWORK_CATEGORIES,
  DATABASE_CATEGORIES,
  DEVOPS_CATEGORIES,
  DATA_AI_CATEGORIES,
  TESTING_CATEGORIES,
  DESIGN_CATEGORIES,
  SECURITY_CATEGORIES,
  COLLABORATION_CATEGORIES,
  LIBRARY_CATEGORIES,
  METHODOLOGY_CATEGORIES,
  BLOCKCHAIN_CATEGORIES,
  IDE_CATEGORIES,
};
