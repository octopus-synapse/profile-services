import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PersonalInfoSchema } from './personal-info.dto';
import { ProfessionalProfileSchema } from './professional-profile.dto';
import { SectionProgressSchema } from './section-progress.dto';
import { TemplateSelectionSchema } from './template-selection.dto';

// StepMeta and StepField schemas are duplicated here for the composed schema
// (they are internal to step-meta.dto.ts, but we need the shape for OnboardingSessionSchema)
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

const StrengthSchema = z.object({
  score: z.number().int().min(0).max(100),
  message: z.string(),
  level: z.enum(['weak', 'growing', 'strong', 'excellent', 'complete']),
});

export const OnboardingSessionSchema = z.object({
  currentStep: z.string(),
  completedSteps: z.array(z.string()),
  progress: z.number().int().min(0).max(100),
  strength: StrengthSchema.optional(),
  canProceed: z.boolean(),
  missingRequired: z.array(z.string()).optional(),
  nextStep: z.string().nullable().optional(),
  previousStep: z.string().nullable().optional(),
  steps: z.array(StepMetaSchema),
  username: z.string().optional(),
  personalInfo: PersonalInfoSchema.optional(),
  professionalProfile: ProfessionalProfileSchema.optional(),
  sections: z.array(SectionProgressSchema).optional(),
  templateSelection: TemplateSelectionSchema.optional(),
});

export class OnboardingSessionDto extends createZodDto(OnboardingSessionSchema) {}
