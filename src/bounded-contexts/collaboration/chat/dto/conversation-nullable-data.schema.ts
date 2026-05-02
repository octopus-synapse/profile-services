import { z } from 'zod';
import { ConversationSchema } from './conversation.schema';

const ConversationNullableDataSchema = z.object({
  conversationId: z.string().nullable(),
  conversation: ConversationSchema.nullable().optional(),
});

export type ConversationNullableDataDto = z.infer<typeof ConversationNullableDataSchema>;
