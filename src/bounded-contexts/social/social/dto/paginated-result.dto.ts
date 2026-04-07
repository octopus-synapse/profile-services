import { z } from 'zod';

export const PaginatedResultSchema = z.object({
  data: z.array(z.any()),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});
