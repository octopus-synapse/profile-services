import { z } from 'zod';

import { ResumeResponseSchema } from './resume-response.schema';
import { SectionSchema } from './section-response.schema';
import { ThemeSchema } from './theme-response.schema';

export const ResumeFullResponseSchema = ResumeResponseSchema.extend({
  resumeSections: z.array(SectionSchema),
  styleId: z.string().optional(),
  style: ThemeSchema.optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
});

export type ResumeFullResponseDto = z.infer<typeof ResumeFullResponseSchema>;
