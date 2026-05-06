import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const ShareLinkDataSchema = z.object({
  id: z.string(),
  slug: z.string(),
  resumeId: z.string(),
  isActive: z.boolean(),
  hasPassword: z.boolean(),
  expiresAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  publicUrl: z.string(),
});

export type ShareLinkDataDto = z.infer<typeof ShareLinkDataSchema>;
