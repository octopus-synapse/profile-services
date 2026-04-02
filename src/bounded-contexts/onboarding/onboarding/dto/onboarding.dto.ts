/**
 * Onboarding DTOs
 *
 * Request and Response DTOs for onboarding endpoints.
 * Uses createZodDto for unified types + validation + Swagger.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

const SectionItemSchema = z.object({
  id: z.string().optional(),
  content: z.record(z.unknown()).optional(),
});

const SectionProgressSchema = z.object({
  sectionTypeKey: z.string(),
  items: z.array(SectionItemSchema).optional(),
  noData: z.boolean().optional(),
});

const PersonalInfoSchema = z.object({
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
});

const ProfessionalProfileSchema = z.object({
  jobTitle: z.string(),
  summary: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
});

const TemplateSelectionSchema = z.object({
  templateId: z.string().optional(),
  colorScheme: z.string().optional(),
});

// ============================================================================
// Request Schemas
// ============================================================================

const GotoStepRequestSchema = z.object({
  stepId: z.string(),
});

const SaveProgressRequestSchema = z.object({
  currentStep: z.string(),
  completedSteps: z.array(z.string()),
  username: z.string().optional(),
  personalInfo: PersonalInfoSchema.optional(),
  professionalProfile: ProfessionalProfileSchema.optional(),
  sections: z.array(SectionProgressSchema).optional(),
  templateSelection: TemplateSelectionSchema.optional(),
});

const CompleteOnboardingRequestSchema = z.object({
  username: z.string(),
  personalInfo: PersonalInfoSchema,
  professionalProfile: ProfessionalProfileSchema,
  templateSelection: TemplateSelectionSchema,
  sections: z.array(SectionProgressSchema).optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

const StepFieldSchema = z.object({
  key: z.string(),
  type: z.string(),
  label: z.string(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  widget: z.string().optional(),
});

const StepMetaSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  required: z.boolean(),
  component: z.string(),
  icon: z.string().optional(),
  fields: z.array(StepFieldSchema).optional(),
  noDataLabel: z.string().optional(),
  placeholder: z.string().optional(),
  addLabel: z.string().optional(),
  multipleItems: z.boolean().optional(),
  sectionTypeKey: z.string().optional(),
});

const FieldMetaSchema = z.object({
  key: z.string(),
  type: z.string(),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
});

const OnboardingSessionSchema = z.object({
  currentStep: z.string(),
  completedSteps: z.array(z.string()),
  progress: z.number().int().min(0).max(100),
  canProceed: z.boolean(),
  nextStep: z.string().nullable().optional(),
  previousStep: z.string().nullable().optional(),
  steps: z.array(StepMetaSchema),
  username: z.string().optional(),
  personalInfo: PersonalInfoSchema.optional(),
  professionalProfile: ProfessionalProfileSchema.optional(),
  sections: z.array(SectionProgressSchema).optional(),
  templateSelection: TemplateSelectionSchema.optional(),
});

const CompleteOnboardingResponseSchema = z.object({
  resumeId: z.string(),
});

const OnboardingStatusResponseSchema = z.object({
  hasCompletedOnboarding: z.boolean(),
  onboardingCompletedAt: z.string().datetime().nullable().optional(),
});

const SaveProgressResponseSchema = z.object({
  currentStep: z.string(),
  completedSteps: z.array(z.string()),
});

// ============================================================================
// DTOs
// ============================================================================

// Common DTOs
export class SectionItemDto extends createZodDto(SectionItemSchema) {}
export class SectionProgressDto extends createZodDto(SectionProgressSchema) {}
export class PersonalInfoDto extends createZodDto(PersonalInfoSchema) {}
export class ProfessionalProfileDto extends createZodDto(ProfessionalProfileSchema) {}
export class TemplateSelectionDto extends createZodDto(TemplateSelectionSchema) {}

// Request DTOs
export class GotoStepRequestDto extends createZodDto(GotoStepRequestSchema) {}
export class SaveProgressRequestDto extends createZodDto(SaveProgressRequestSchema) {}
export class CompleteOnboardingRequestDto extends createZodDto(CompleteOnboardingRequestSchema) {}

// Response DTOs
export class FieldMetaDto extends createZodDto(FieldMetaSchema) {}
export class StepMetaDto extends createZodDto(StepMetaSchema) {}
export class OnboardingSessionDto extends createZodDto(OnboardingSessionSchema) {}
export class CompleteOnboardingResponseDto extends createZodDto(CompleteOnboardingResponseSchema) {}
export class OnboardingStatusResponseDto extends createZodDto(OnboardingStatusResponseSchema) {}
export class SaveProgressResponseDto extends createZodDto(SaveProgressResponseSchema) {}

// Backward compat alias
// Export schemas for validation
export {
  CompleteOnboardingRequestSchema,
  OnboardingSessionDto as OnboardingProgressDto,
  OnboardingSessionSchema,
  PersonalInfoSchema,
  ProfessionalProfileSchema,
  SaveProgressRequestSchema,
  SectionProgressSchema,
  TemplateSelectionSchema,
};
