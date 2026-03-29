/**
 * Public Resume Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const PublicShareInfoSchema = z.object({
  slug: z.string(),
  expiresAt: z.string().datetime().nullable(),
});

const PublicResumeDataSchema = z.object({
  resume: z.record(z.unknown()).nullable(),
  share: PublicShareInfoSchema,
});

// ============================================================================
// DTOs
// ============================================================================

export class PublicShareInfoDto extends createZodDto(PublicShareInfoSchema) {}
export class PublicResumeDataDto extends createZodDto(PublicResumeDataSchema) {}
