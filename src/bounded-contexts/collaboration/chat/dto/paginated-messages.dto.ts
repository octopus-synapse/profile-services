import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MessageSchema } from './message.dto';

export const PaginatedMessagesSchema = z.object({
  messages: z.array(MessageSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export class PaginatedMessagesDto extends createZodDto(PaginatedMessagesSchema) {}
