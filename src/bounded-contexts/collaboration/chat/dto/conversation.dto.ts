import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ConversationParticipantSchema } from './conversation-participant.dto';
import { LastMessageSchema } from './last-message.dto';

export const ConversationSchema = z.object({
  id: z.string(),
  participant: ConversationParticipantSchema,
  lastMessage: LastMessageSchema.nullable(),
  unreadCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class ConversationDto extends createZodDto(ConversationSchema) {}
