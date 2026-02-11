/**
 * Stack Overflow Categories
 * Re-exports skill categories for Stack Overflow tag parsing
 */

import type { SkillType } from '../interfaces';
import { SKILL_CATEGORIES } from './skill-categories.const';

export type StackOverflowCategory = { type: SkillType; niche: string | null };

/**
 * Stack Overflow specific category mappings
 * Uses the general skill categories but can be extended with SO-specific mappings
 */
export const STACKOVERFLOW_CATEGORIES: Record<string, StackOverflowCategory> = SKILL_CATEGORIES;
