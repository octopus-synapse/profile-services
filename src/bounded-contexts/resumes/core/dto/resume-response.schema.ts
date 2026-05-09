import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const ResumeResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  language: z.string().optional(),
  targetRole: z.string().optional(),
  isPublic: z.boolean(),
  slug: z.string().optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type ResumeResponseDto = z.infer<typeof ResumeResponseSchema>;
