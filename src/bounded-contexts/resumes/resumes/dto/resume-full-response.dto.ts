import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ResumeResponseSchema } from './resume-response.dto';
import { SectionSchema } from './section-response.dto';
import { ThemeSchema } from './theme-response.dto';

export const ResumeFullResponseSchema = ResumeResponseSchema.extend({
  resumeSections: z.array(SectionSchema),
  activeThemeId: z.string().optional(),
  activeTheme: ThemeSchema.optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
});

export class ResumeFullResponseDto extends createZodDto(ResumeFullResponseSchema) {}
