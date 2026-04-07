import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ConversationSchema } from './conversation.dto';

const ConversationNullableDataSchema = z.object({
  conversationId: z.string().nullable(),
  conversation: ConversationSchema.nullable().optional(),
});

export class ConversationNullableDataDto extends createZodDto(ConversationNullableDataSchema) {}
