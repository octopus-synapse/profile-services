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
 * The code doesn't know what "experience" or "education" is - all section
 * knowledge comes from the database.
 */

import { z } from 'zod';
import { EmailSchema } from '../schemas/primitives';
import { ProfessionalProfileSchema } from './professional-profile.schema';
import { UsernameSchema } from './username.schema';

// ============================================================================
// Enum Schemas (for backward compatibility)
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
export const PersonalInfoSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100),
  email: EmailSchema,
  phone: z.string().max(20).optional(),
  location: z.string().max(100).optional(),
});

/**
 * Template Selection Schema
 */
export const TemplateSelectionSchema = z.object({
  template: z.string().min(1, 'Template is required'),
  palette: z.string().min(1, 'Color palette is required'),
});

export type TemplateSelection = z.infer<typeof TemplateSelectionSchema>;

/**
 * Generic Section Item Schema
 *
 * Content is validated dynamically against SectionType.definition.
 * The schema here only validates structure, not field-level rules.
 */
export const OnboardingSectionItemSchema = z.object({
  content: z.record(z.unknown()),
});

export type OnboardingSectionItem = z.infer<typeof OnboardingSectionItemSchema>;

/**
 * Generic Section Schema for Onboarding
 *
 * Each section references a SectionType by key (e.g., 'work_experience_v1').
 * Field-level validation happens server-side using SectionDefinitionZodFactory.
 */
export const OnboardingSectionSchema = z.object({
  sectionTypeKey: z.string().min(1, 'Section type key is required'),
  items: z.array(OnboardingSectionItemSchema).default([]),
  noData: z.boolean().default(false),
});

export type OnboardingSection = z.infer<typeof OnboardingSectionSchema>;

/**
 * Complete Onboarding Payload Schema (Generic Sections Format)
 *
 * BREAKING CHANGE: This replaces the legacy section-specific format.
 * Instead of { experiences: [...], education: [...], skills: [...] },
 * we now use { sections: [{ sectionTypeKey: 'work_experience_v1', items: [...] }] }.
 *
 * Benefits:
 * - Any new section type works automatically
 * - No code changes needed for new sections
 * - Validation rules come from SectionType.definition
 */
export const OnboardingDataSchema = z.object({
  username: UsernameSchema,
  personalInfo: PersonalInfoSchema,
  professionalProfile: ProfessionalProfileSchema,
  templateSelection: TemplateSelectionSchema,
  sections: z.array(OnboardingSectionSchema).default([]),
});

export type OnboardingData = z.infer<typeof OnboardingDataSchema>;
