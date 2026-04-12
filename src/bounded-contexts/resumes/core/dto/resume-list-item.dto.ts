import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ResumeResponseSchema } from './resume-response.dto';

export const ResumeListItemSchema = ResumeResponseSchema.extend({
  viewCount: z.number().int().optional(),
  lastViewedAt: z.string().datetime().optional(),
});

export class ResumeListItemDto extends createZodDto(ResumeListItemSchema) {}
