import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginatedConversationsSchema } from './paginated-conversations.dto';

const ConversationsListDataSchema = z.object({
  conversations: PaginatedConversationsSchema,
});

export class ConversationsListDataDto extends createZodDto(ConversationsListDataSchema) {}
