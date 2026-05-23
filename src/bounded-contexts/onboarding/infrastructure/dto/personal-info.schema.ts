/**
 * Personal info DTO — re-exports the domain schema as the single source
 * of truth. Used by both write-side (request) and read-side (response)
 * routes; for response shapes that need to tolerate legacy stored values,
 * use `PersonalInfoViewSchema` below.
 *
 * Owning the schema in `domain/schemas/onboarding-data.schema.ts` keeps
 * the validation rules consistent across SaveProgress, CompleteOnboarding,
 * and the OnboardingProgress JSON column.
 */

import { PersonalInfoSchema } from '../../domain/schemas/onboarding-data.schema';

export type { PersonalInfoDto } from '../../domain/schemas/onboarding-data.schema';
export { PersonalInfoSchema };

/**
 * Permissive view of personal info — used in response payloads where the
 * DB column may already hold legacy values that wouldn't pass the
 * strict input schema (e.g. fullName shorter than the post-fix minimum).
 * Strips validation but keeps the shape.
 */
export const PersonalInfoViewSchema = PersonalInfoSchema.partial();
