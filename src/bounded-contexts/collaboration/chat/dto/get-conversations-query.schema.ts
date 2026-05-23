import { z } from 'zod';

export const GetConversationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type GetConversationsQueryDto = z.infer<typeof GetConversationsQuerySchema>;
