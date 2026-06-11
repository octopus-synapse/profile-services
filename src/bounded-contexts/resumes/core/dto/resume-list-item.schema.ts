import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { ResumeResponseSchema } from './resume-response.schema';

export const ResumeListItemSchema = ResumeResponseSchema.extend({
  viewCount: z.number().int().optional(),
  lastViewedAt: IsoDateTimeSchema.optional(),
  fullName: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  isPrimary: z.boolean(),
  style: z.object({ id: z.string(), name: z.string() }).optional(),
});

export type ResumeListItemDto = z.infer<typeof ResumeListItemSchema>;
