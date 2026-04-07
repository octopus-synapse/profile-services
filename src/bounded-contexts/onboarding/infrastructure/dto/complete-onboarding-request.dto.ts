import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PersonalInfoSchema } from './personal-info.dto';
import { ProfessionalProfileSchema } from './professional-profile.dto';
import { SectionProgressSchema } from './section-progress.dto';
import { TemplateSelectionSchema } from './template-selection.dto';

export const CompleteOnboardingRequestSchema = z.object({
  username: z.string(),
  personalInfo: PersonalInfoSchema,
  professionalProfile: ProfessionalProfileSchema,
  templateSelection: TemplateSelectionSchema,
  sections: z.array(SectionProgressSchema).optional(),
});

export class CompleteOnboardingRequestDto extends createZodDto(CompleteOnboardingRequestSchema) {}
