import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ShareLinkDataSchema = z.object({
  id: z.string(),
  slug: z.string(),
  resumeId: z.string(),
  isActive: z.boolean(),
  hasPassword: z.boolean(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  publicUrl: z.string(),
});

export class ShareLinkDataDto extends createZodDto(ShareLinkDataSchema) {}
