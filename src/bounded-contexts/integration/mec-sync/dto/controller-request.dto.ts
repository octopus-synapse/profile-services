/**
 * MEC Sync Controller Request DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const TriggerMecSyncRequestSchema = z.object({
  fullSync: z.boolean().default(false).optional(),
  source: z.string().default('api').optional(),
});

// ============================================================================
// DTOs
// ============================================================================

export class TriggerMecSyncRequestDto extends createZodDto(TriggerMecSyncRequestSchema) {}
