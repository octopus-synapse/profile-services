import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ConversationSchema } from './conversation.dto';

export const PaginatedConversationsSchema = z.object({
  conversations: z.array(ConversationSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export class PaginatedConversationsDto extends createZodDto(PaginatedConversationsSchema) {}
