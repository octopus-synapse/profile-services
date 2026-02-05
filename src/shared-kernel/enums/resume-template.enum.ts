import { z } from 'zod';

/**
 * Resume Template Enum (Domain)
 *
 * Defines the available resume templates.
 * This is a DOMAIN concept - independent of any infrastructure (Prisma, etc).
 *
 * Note: If Prisma enum changes, update this file and run tests.
 * The mapping to Prisma should happen at the infrastructure layer (profile-services).
 */
export const ResumeTemplateSchema = z.enum([
  'PROFESSIONAL',
  'CREATIVE',
  'TECHNICAL',
  'MINIMAL',
  'MODERN',
  'EXECUTIVE',
  'ACADEMIC',
]);

export type ResumeTemplate = z.infer<typeof ResumeTemplateSchema>;

/**
 * Kebab-case version for DSL/API compatibility
 */
export const ResumeTemplateKebabSchema = z.enum([
  'professional',
  'creative',
  'technical',
  'minimal',
  'modern',
  'executive',
  'academic',
]);

export type ResumeTemplateKebab = z.infer<typeof ResumeTemplateKebabSchema>;

/**
 * Mapping functions
 */
export const resumeTemplateToKebab = (
  value: ResumeTemplate,
): ResumeTemplateKebab => {
  return value.toLowerCase() as ResumeTemplateKebab;
};

export const resumeTemplateFromKebab = (
  value: ResumeTemplateKebab,
): ResumeTemplate => {
  return value.toUpperCase() as ResumeTemplate;
};
