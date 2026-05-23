import { z } from 'zod';

export const HistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type HistoryQueryDto = z.infer<typeof HistoryQuerySchema>;
