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

export type TriggerMecSyncRequestDto = z.infer<typeof TriggerMecSyncRequestSchema>;
