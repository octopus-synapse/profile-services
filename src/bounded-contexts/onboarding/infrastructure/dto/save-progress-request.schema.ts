import { z } from 'zod';
import { PersonalInfoSchema } from './personal-info.schema';
import { ProfessionalProfileSchema } from './professional-profile.schema';
import { SectionProgressSchema } from './section-progress.schema';
import { TemplateSelectionSchema } from './template-selection.schema';

export const SaveProgressRequestSchema = z.object({
  currentStep: z.string(),
  completedSteps: z.array(z.string()),
  username: z.string().optional(),
  personalInfo: PersonalInfoSchema.optional(),
  professionalProfile: ProfessionalProfileSchema.optional(),
  sections: z.array(SectionProgressSchema).optional(),
  templateSelection: TemplateSelectionSchema.optional(),
});

export type SaveProgressRequestDto = z.infer<typeof SaveProgressRequestSchema>;
