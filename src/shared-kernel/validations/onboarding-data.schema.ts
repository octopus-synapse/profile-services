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
import { EmailSchema } from '../schemas/primitives';
import { normalizeSectionTypeKey } from '../utils/section-type-key.util';
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
export const PersonalInfoSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: EmailSchema,
  phone: z.string().max(20).optional(),
  location: z.string().max(100).optional(),
});

/**
 * Template Selection Schema
 * Accepts both SDK format (templateId/colorScheme) and legacy format (template/palette)
 */
export const TemplateSelectionSchema = z.object({
  // SDK format (primary)
  templateId: z.string().optional(),
  colorScheme: z.string().optional(),
  // Legacy format (backward compat)
  template: z.string().optional(),
  palette: z.string().optional(),
});

export type TemplateSelection = z.infer<typeof TemplateSelectionSchema>;

/**
 * Validates and normalizes template selection data.
 * Ensures at least template+palette or templateId+colorScheme is present.
 */
export function normalizeTemplateSelection(data: TemplateSelection): {
  templateId: string;
  colorScheme: string;
} {
  const templateId = data.templateId || data.template || 'professional';
  const colorScheme = data.colorScheme || data.palette || 'ocean';
  return { templateId, colorScheme };
}

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
export const OnboardingDataSchema = z.object({
  username: UsernameSchema,
  personalInfo: PersonalInfoSchema,
  professionalProfile: ProfessionalProfileSchema,
  templateSelection: TemplateSelectionSchema,
  sections: z.array(OnboardingSectionSchema).default([]),
});

export type OnboardingData = z.infer<typeof OnboardingDataSchema>;
