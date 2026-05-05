import { z } from 'zod';

/**
 * Generic single-id route param: `/:id`.
 *
 * Validation tightened to `z.string().uuid()` after the Prisma UUID v7
 * migration (Q11 phase 2). v4 and v7 share the same textual form so
 * legacy rows still validate.
 */
export const IdParamSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
});

export type IdParam = z.infer<typeof IdParamSchema>;
