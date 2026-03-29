import { z } from 'zod';

/**
 * Skill Type Enum (Domain)
 *
 * Defines the classification/category of a skill.
 */
export const SkillTypeSchema = z.enum([
  'LANGUAGE',
  'FRAMEWORK',
  'LIBRARY',
  'DATABASE',
  'TOOL',
  'PLATFORM',
  'METHODOLOGY',
  'SOFT_SKILL',
  'CERTIFICATION',
  'OTHER',
]);

export type SkillType = z.infer<typeof SkillTypeSchema>;

/**
 * Kebab-case version for API/DSL compatibility
 */
export const SkillTypeKebabSchema = z.enum([
  'language',
  'framework',
  'library',
  'database',
  'tool',
  'platform',
  'methodology',
  'soft-skill',
  'certification',
  'other',
]);

export type SkillTypeKebab = z.infer<typeof SkillTypeKebabSchema>;

export const skillTypeToKebab = (value: SkillType): SkillTypeKebab => {
  const mapping: Record<SkillType, SkillTypeKebab> = {
    LANGUAGE: 'language',
    FRAMEWORK: 'framework',
    LIBRARY: 'library',
    DATABASE: 'database',
    TOOL: 'tool',
    PLATFORM: 'platform',
    METHODOLOGY: 'methodology',
    SOFT_SKILL: 'soft-skill',
    CERTIFICATION: 'certification',
    OTHER: 'other',
  };
  return mapping[value];
};

export const skillTypeFromKebab = (value: SkillTypeKebab): SkillType => {
  const mapping: Record<SkillTypeKebab, SkillType> = {
    language: 'LANGUAGE',
    framework: 'FRAMEWORK',
    library: 'LIBRARY',
    database: 'DATABASE',
    tool: 'TOOL',
    platform: 'PLATFORM',
    methodology: 'METHODOLOGY',
    'soft-skill': 'SOFT_SKILL',
    certification: 'CERTIFICATION',
    other: 'OTHER',
  };
  return mapping[value];
};
