import { z } from 'zod';

import { ResumeResponseSchema } from './resume-response.schema';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const ResumeListItemSchema = ResumeResponseSchema.extend({
  viewCount: z.number().int().optional(),
  lastViewedAt: IsoDateTimeSchema.optional(),
});

export type ResumeListItemDto = z.infer<typeof ResumeListItemSchema>;
