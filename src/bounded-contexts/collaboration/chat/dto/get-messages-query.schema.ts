import { z } from 'zod';

export const GetMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type GetMessagesQueryDto = z.infer<typeof GetMessagesQuerySchema>;
