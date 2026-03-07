/**
 * Section Configuration DTOs
 *
 * Domain types and validation schemas for managing resume section visibility
 * and ordering.
 */

import { z } from 'zod';

// ============================================================================
// Section Update
// ============================================================================

export const SectionUpdateSchema = z.object({
  id: z.string().cuid(),
  visible: z.boolean().optional(),
  order: z.number().int().nonnegative().optional(),
});

export type SectionUpdate = z.infer<typeof SectionUpdateSchema>;

// ============================================================================
// Bulk Section Update
// ============================================================================

export const BulkUpdateSectionsSchema = z.object({
  updates: z.array(SectionUpdateSchema).min(1),
});

export type BulkUpdateSections = z.infer<typeof BulkUpdateSectionsSchema>;
