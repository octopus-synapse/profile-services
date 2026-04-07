import { z } from 'zod';

/**
 * Skill Level Enum (Domain)
 *
 * Defines the proficiency levels for technical skills.
 * This is a DOMAIN concept - independent of any infrastructure (Prisma, etc).
 */
export const SkillLevelSchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']);

export type SkillLevel = z.infer<typeof SkillLevelSchema>;

/**
 * Numeric mapping for sorting/comparison
 */
export const SkillLevelToNumeric: Record<SkillLevel, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};
