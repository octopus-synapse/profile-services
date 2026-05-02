import { z } from 'zod';
import { ConversationParticipantSchema } from './conversation-participant.schema';
import { LastMessageSchema } from './last-message.schema';

export const ConversationSchema = z.object({
  id: z.string(),
  participant: ConversationParticipantSchema,
  lastMessage: LastMessageSchema.nullable(),
  unreadCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ConversationDto = z.infer<typeof ConversationSchema>;
