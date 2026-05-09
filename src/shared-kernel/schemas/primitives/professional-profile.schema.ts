import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { STRING_LIMITS } from '../../constants';
import { EXAMPLE_DESCRIPTION, EXAMPLE_TITLE, EXAMPLE_URL } from '../params/example-values.const';

extendZodWithOpenApi(z);

/**
 * Professional Profile Schema
 *
 * Validates the professional profile section of user onboarding.
 * Includes job title, summary, and social/portfolio URLs.
 */

/**
 * Job title validation
 */
export const JobTitleSchema = z
  .string()
  .min(2, 'Job title must be at least 2 characters')
  .max(STRING_LIMITS.TITLE.MAX, `Job title must be less than ${STRING_LIMITS.TITLE.MAX} characters`)
  .trim()
  .openapi({ example: EXAMPLE_TITLE });

/**
 * Professional summary validation
 * Requires minimum length to ensure meaningful content
 */
export const ProfessionalSummarySchema = z
  .string()
  .min(50, 'Summary must be at least 50 characters to provide meaningful content')
  .max(
    STRING_LIMITS.SUMMARY.MAX,
    `Summary must be less than ${STRING_LIMITS.SUMMARY.MAX} characters`,
  )
  .trim()
  .openapi({ example: EXAMPLE_DESCRIPTION });

/**
 * Optional URL validation
 * Accepts empty string or valid URL
 */
const OptionalUrlSchema = z
  .string()
  .trim()
  .pipe(z.union([z.literal(''), z.string().url('Invalid URL format')]))
  .transform((val) => (val === '' ? undefined : val))
  .optional()
  .openapi({ example: EXAMPLE_URL });

/**
 * Professional Profile Schema
 */
export const ProfessionalProfileSchema = z.object({
  jobTitle: JobTitleSchema,
  summary: ProfessionalSummarySchema,
  linkedin: OptionalUrlSchema,
  github: OptionalUrlSchema,
  website: OptionalUrlSchema,
});

export type ProfessionalProfile = z.infer<typeof ProfessionalProfileSchema>;

/**
 * Partial professional profile for updates
 */
export const UpdateProfessionalProfileSchema = ProfessionalProfileSchema.partial();

export type UpdateProfessionalProfile = z.infer<typeof UpdateProfessionalProfileSchema>;

export type JobTitleDto = z.infer<typeof JobTitleSchema>;

export type ProfessionalSummaryDto = z.infer<typeof ProfessionalSummarySchema>;

export type ProfessionalProfileDto = z.infer<typeof ProfessionalProfileSchema>;

export type UpdateProfessionalProfileDto = z.infer<typeof UpdateProfessionalProfileSchema>;

export type OptionalUrlDto = z.infer<typeof OptionalUrlSchema>;
