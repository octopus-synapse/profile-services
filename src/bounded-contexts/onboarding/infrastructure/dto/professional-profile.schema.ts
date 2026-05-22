/**
 * Professional profile DTO — re-exports the domain schema as the single
 * source of truth. Strict shape used for write-side routes (SaveProgress,
 * CompleteOnboarding). Response routes that may surface legacy rows use
 * `ProfessionalProfileViewSchema`, which strips required-field gates.
 */

import { ProfessionalProfileSchema } from '../../domain/schemas/professional-profile.schema';

export type { ProfessionalProfileDto } from '../../domain/schemas/professional-profile.schema';
export { ProfessionalProfileSchema };

/** Permissive read-side view — drops `.min` / `.required` so a legacy
 * row missing `summary` (or any new field added later) doesn't break the
 * response. Structural typing only. */
export const ProfessionalProfileViewSchema = ProfessionalProfileSchema.partial();

import type { z } from 'zod';
export type ProfessionalProfileViewDto = z.infer<typeof ProfessionalProfileViewSchema>;
