/**
 * Stack Overflow Colors
 * Re-exports skill colors for Stack Overflow tag parsing
 */

import { SKILL_COLORS } from './skill-colors.const';

/**
 * Stack Overflow specific color mappings
 * Uses the general skill colors but can be extended with SO-specific mappings
 */
export const STACKOVERFLOW_COLORS: Record<string, string> = SKILL_COLORS;
