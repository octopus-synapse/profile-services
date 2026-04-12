/**
 * Professional Profile Schema (Onboarding contract)
 *
 * Local copy of the professional profile validation for onboarding.
 * This BC owns its own contract — if identity changes, onboarding decides if it follows.
 */

import { z } from 'zod';
import {
  GitHubUrlSchema,
  LinkedInUrlSchema,
  SocialUrlSchema,
} from '@/shared-kernel/schemas/primitives';

const JobTitleSchema = z
  .string()
  .min(2, 'Job title must be at least 2 characters')
  .max(100, 'Job title cannot exceed 100 characters')
  .trim();

const SummarySchema = z
  .string()
  .min(10, 'Summary must be at least 10 characters')
  .max(500, 'Summary cannot exceed 500 characters')
  .trim();

export const ProfessionalProfileSchema = z.object({
  title: JobTitleSchema.optional(),
  jobTitle: JobTitleSchema.optional(),
  summary: SummarySchema,
  linkedin: LinkedInUrlSchema,
  github: GitHubUrlSchema,
  website: SocialUrlSchema,
});
