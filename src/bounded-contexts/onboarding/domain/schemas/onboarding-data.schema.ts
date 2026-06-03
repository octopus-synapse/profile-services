/**
 * Onboarding Data Validation Schema
 *
 * Complete payload validation for onboarding submission.
 * Ensures data integrity before API submission.
 *
 * IMPORTANT: These schemas are the single source of truth for
 * profile-backend, profile-frontend, and api-client.
 *
 * ARCHITECTURE NOTE: This schema now uses GENERIC SECTIONS.
 * Section-specific validation is done dynamically using SectionType definitions.
 * All section knowledge comes from the database.
 */

import { z } from 'zod';
import { PhoneSchema, UserLocationSchema } from '@/shared-kernel/schemas/primitives';
import { normalizeSectionTypeKey } from '@/shared-kernel/utils/section-type-key.util';
import { ProfessionalProfileSchema } from './professional-profile.schema';
import { UsernameSchema } from './username.schema';

// ============================================================================
// Shared Enum Schemas
// ============================================================================

export const LanguageProficiencyEnum = z.enum([
  'BASIC',
  'INTERMEDIATE',
  'ADVANCED',
  'FLUENT',
  'NATIVE',
]);

export const CefrLevelEnum = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

// PersonalInfoSchema (exported for onboarding-progress.dto.ts)
// Single source of truth for the user's email is `User.email` (signup) — no
// separate contact email is collected during onboarding.
export const PersonalInfoSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  phone: PhoneSchema,
  location: UserLocationSchema,
});

/**
 * Generic Section Item Schema
 *
 * Content is validated dynamically against SectionType.definition.
 * The schema here only validates structure, not field-level rules.
 */
export const OnboardingSectionItemSchema = z.object({ content: z.record(z.unknown()) });

export type OnboardingSectionItem = z.infer<typeof OnboardingSectionItemSchema>;

/**
 * Generic Section Schema for Onboarding
 *
 * Each section references a SectionType by key.
 * Field-level validation happens server-side using SectionDefinitionZodFactory.
 */
export const OnboardingSectionSchema = z
  .object({
    sectionTypeKey: z.string().min(1, 'Section type key is required'),
    items: z.array(OnboardingSectionItemSchema).default([]),
    noData: z.boolean().default(false),
  })
  .transform((section) => ({
    ...section,
    sectionTypeKey: normalizeSectionTypeKey(section.sectionTypeKey),
  }));

export type OnboardingSection = z.infer<typeof OnboardingSectionSchema>;

/**
 * Complete Onboarding Payload Schema (Generic Sections Format)
 *
 * Complete onboarding payload uses the canonical generic sections format.
 *
 * Benefits:
 * - Any new section type works automatically
 * - No code changes needed for new sections
 * - Validation rules come from SectionType.definition
 */
export const OnboardingDataSchema = z
  .object({
    username: UsernameSchema,
    personalInfo: PersonalInfoSchema,
    professionalProfile: ProfessionalProfileSchema,
    /**
     * FK to `ResumeStyle.id` chosen on the resume-style step. `null` is
     * valid (the step is optional at completion time — the resume gets
     * the seeded default style if missing).
     */
    resumeStyleId: z.string().uuid().nullable().optional(),
    sections: z.array(OnboardingSectionSchema).default([]),
  })
  .openapi({
    example: {
      username: 'janedoe',
      personalInfo: {
        fullName: 'Jane Doe',
        phone: '+1 415 555 1234',
        location: 'San Francisco, CA',
      },
      professionalProfile: {
        headline: 'Senior Backend Engineer',
        summary: 'Backend engineer with 8+ years building distributed systems.',
      },
      resumeStyleId: '019e4a58-581a-7679-9351-df6a83687eed',
      sections: [],
    },
  });

export type OnboardingData = z.infer<typeof OnboardingDataSchema>;

export type PersonalInfoDto = z.infer<typeof PersonalInfoSchema>;

export type OnboardingSectionItemDto = z.infer<typeof OnboardingSectionItemSchema>;

export type OnboardingSectionDto = z.infer<typeof OnboardingSectionSchema>;

export type OnboardingDataDto = z.infer<typeof OnboardingDataSchema>;
