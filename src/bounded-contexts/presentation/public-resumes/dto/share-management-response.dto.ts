/**
 * Share Management Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const ShareLinkDataSchema = z.object({
  id: z.string(),
  slug: z.string(),
  resumeId: z.string(),
  isActive: z.boolean(),
  hasPassword: z.boolean(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  publicUrl: z.string(),
});

const ShareCreateDataSchema = z.object({
  share: ShareLinkDataSchema,
});

const ShareListDataSchema = z.object({
  shares: z.array(ShareLinkDataSchema),
});

const ShareDeleteDataSchema = z.object({
  deleted: z.boolean(),
});

// ============================================================================
// DTOs
// ============================================================================

export class ShareLinkDataDto extends createZodDto(ShareLinkDataSchema) {}
export class ShareCreateDataDto extends createZodDto(ShareCreateDataSchema) {}
export class ShareListDataDto extends createZodDto(ShareListDataSchema) {}
export class ShareDeleteDataDto extends createZodDto(ShareDeleteDataSchema) {}
