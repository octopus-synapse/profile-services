import { z } from 'zod';

/**
 * Canonical paginated shape for social BC. Matches
 * `PaginatedResponseSchema` from shared-kernel: `items` (not `data`),
 * with `hasNext` / `hasPrev`.
 */
export const PaginatedResultSchema = z.object({
  items: z.array(z.any()),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type PaginatedResultDto = z.infer<typeof PaginatedResultSchema>;
