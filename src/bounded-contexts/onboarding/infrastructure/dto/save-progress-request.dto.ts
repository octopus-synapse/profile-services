import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PersonalInfoSchema } from './personal-info.dto';
import { ProfessionalProfileSchema } from './professional-profile.dto';
import { SectionProgressSchema } from './section-progress.dto';
import { TemplateSelectionSchema } from './template-selection.dto';

export const SaveProgressRequestSchema = z.object({
  currentStep: z.string(),
  completedSteps: z.array(z.string()),
  username: z.string().optional(),
  personalInfo: PersonalInfoSchema.optional(),
  professionalProfile: ProfessionalProfileSchema.optional(),
  sections: z.array(SectionProgressSchema).optional(),
  templateSelection: TemplateSelectionSchema.optional(),
});

export class SaveProgressRequestDto extends createZodDto(SaveProgressRequestSchema) {}
