import { z } from 'zod';
import { MessageSchema } from './message.schema';

export const PaginatedMessagesSchema = z.object({
  messages: z.array(MessageSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type PaginatedMessagesDto = z.infer<typeof PaginatedMessagesSchema>;
