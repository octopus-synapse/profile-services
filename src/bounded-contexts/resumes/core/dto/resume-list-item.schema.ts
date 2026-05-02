import { z } from 'zod';

import { ResumeResponseSchema } from './resume-response.schema';

export const ResumeListItemSchema = ResumeResponseSchema.extend({
  viewCount: z.number().int().optional(),
  lastViewedAt: z.string().datetime().optional(),
});

export type ResumeListItemDto = z.infer<typeof ResumeListItemSchema>;
