import { z } from 'zod';

/**
 * Tech Area Type Enum (Domain)
 *
 * Defines the technical areas/domains for skills and experience.
 */
export const TechAreaTypeSchema = z.enum([
  'DEVELOPMENT',
  'DEVOPS',
  'DATA',
  'SECURITY',
  'DESIGN',
  'PRODUCT',
  'QA',
  'INFRASTRUCTURE',
  'OTHER',
]);

export type TechAreaType = z.infer<typeof TechAreaTypeSchema>;

/**
 * Kebab-case version for API/DSL compatibility
 */
export const TechAreaTypeKebabSchema = z.enum([
  'development',
  'devops',
  'data',
  'security',
  'design',
  'product',
  'qa',
  'infrastructure',
  'other',
]);

export type TechAreaTypeKebab = z.infer<typeof TechAreaTypeKebabSchema>;

export const techAreaTypeToKebab = (value: TechAreaType): TechAreaTypeKebab => {
  return value.toLowerCase() as TechAreaTypeKebab;
};

export const techAreaTypeFromKebab = (
  value: TechAreaTypeKebab,
): TechAreaType => {
  return value.toUpperCase() as TechAreaType;
};
