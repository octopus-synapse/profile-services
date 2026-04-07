import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginatedMessagesSchema } from './paginated-messages.dto';

const MessagesListDataSchema = z.object({
  messages: PaginatedMessagesSchema,
});

export class MessagesListDataDto extends createZodDto(MessagesListDataSchema) {}
