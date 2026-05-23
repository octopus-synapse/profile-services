import { z } from 'zod';
import { ConversationSchema } from './conversation.schema';

export const PaginatedConversationsSchema = z.object({
  conversations: z.array(ConversationSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type PaginatedConversationsDto = z.infer<typeof PaginatedConversationsSchema>;
