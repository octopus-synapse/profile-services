import { z } from 'zod';

/**
 * Generic single-id route param: `/:id`.
 *
 * Validation is `z.string().min(1)` (not `.uuid()`) until the Prisma
 * UUID v7 migration lands — see Q11 in the duplication audit. Switch to
 * `.uuid()` together with the Prisma schema change to avoid breaking
 * existing CUID-shaped IDs in transit.
 */
export const IdParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export type IdParam = z.infer<typeof IdParamSchema>;
