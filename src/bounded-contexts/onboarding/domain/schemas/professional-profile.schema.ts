/**
 * Professional Profile Schema (Onboarding contract)
 *
 * Local copy of the professional profile validation for onboarding.
 * This BC owns its own contract — if identity changes, onboarding decides if it follows.
 */

import { z } from 'zod';
import {
  GitHubUrlSchema,
  HeadlineSchema,
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

// Onboarding additionally requires the headline to be non-empty: the step
// exists to collect it. The length rule is the shared one.
const RequiredHeadlineSchema = HeadlineSchema.min(1, 'Headline cannot be empty');

export const ProfessionalProfileSchema = z.object({
  title: JobTitleSchema.optional(),
  headline: RequiredHeadlineSchema.optional(),
  summary: SummarySchema,
  linkedin: LinkedInUrlSchema.optional(),
  github: GitHubUrlSchema.optional(),
  website: SocialUrlSchema.optional(),
  portfolio: SocialUrlSchema.optional(),
});

export type ProfessionalProfileDto = z.infer<typeof ProfessionalProfileSchema>;

export type JobTitleDto = z.infer<typeof JobTitleSchema>;

export type SummaryDto = z.infer<typeof SummarySchema>;
