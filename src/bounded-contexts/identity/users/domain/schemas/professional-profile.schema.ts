/**
 * Professional Profile Validation Schemas
 *
 * Domain rules for career-related information.
 * Used in onboarding and profile management.
 */

import { z } from 'zod';
import {
  GitHubUrlSchema,
  LinkedInUrlSchema,
  SocialUrlSchema,
} from '@/shared-kernel/schemas/primitives';

export type { GitHubUrl, LinkedInUrl, SocialUrl } from '@/shared-kernel/schemas/primitives';
export { GitHubUrlSchema, LinkedInUrlSchema, SocialUrlSchema };

/**
 * Job Title Schema
 *
 * Flexible format for various roles and seniority levels.
 */
export const JobTitleSchema = z
  .string()
  .min(2, 'Job title must be at least 2 characters')
  .max(100, 'Job title cannot exceed 100 characters')
  .trim();

export type JobTitle = z.infer<typeof JobTitleSchema>;

/**
 * Professional Summary Schema
 *
 * Brief bio/tagline for profile.
 */
export const SummarySchema = z
  .string()
  .min(10, 'Summary must be at least 10 characters')
  .max(500, 'Summary cannot exceed 500 characters')
  .trim();

export type Summary = z.infer<typeof SummarySchema>;

/**
 * Professional Profile Complete Schema
 *
 * Combines all professional information fields.
 * Accepts both SDK format (title) and backend format (jobTitle)
 */
export const ProfessionalProfileSchema = z.object({
  // Both title and jobTitle are accepted for compatibility
  title: JobTitleSchema.optional(),
  jobTitle: JobTitleSchema.optional(),
  summary: SummarySchema,
  linkedin: LinkedInUrlSchema,
  github: GitHubUrlSchema,
  website: SocialUrlSchema,
});

export type ProfessionalProfile = z.infer<typeof ProfessionalProfileSchema>;

/**
 * Get the job title from profile data, accepting both formats
 */
export function getJobTitle(profile: ProfessionalProfile): string | undefined {
  return profile.title || profile.jobTitle;
}
