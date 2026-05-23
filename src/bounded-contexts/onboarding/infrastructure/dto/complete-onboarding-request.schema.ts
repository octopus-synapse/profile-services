import { z } from 'zod';
import { PersonalInfoSchema } from './personal-info.schema';
import { ProfessionalProfileSchema } from './professional-profile.schema';
import { SectionProgressSchema } from './section-progress.schema';

export const CompleteOnboardingRequestSchema = z.object({
  username: z.string(),
  personalInfo: PersonalInfoSchema,
  professionalProfile: ProfessionalProfileSchema,
  resumeStyleId: z.string().uuid().nullable().optional(),
  sections: z.array(SectionProgressSchema).optional(),
});

export type CompleteOnboardingRequestDto = z.infer<typeof CompleteOnboardingRequestSchema>;
