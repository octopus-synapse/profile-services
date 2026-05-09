import { z } from 'zod';

export const ProfessionalProfileSchema = z.object({
  jobTitle: z.string(),
  summary: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
});

export type ProfessionalProfileDto = z.infer<typeof ProfessionalProfileSchema>;
