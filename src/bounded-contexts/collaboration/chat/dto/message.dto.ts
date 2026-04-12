import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MessageSenderSchema } from './message-sender.dto';

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  isRead: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
  sender: MessageSenderSchema,
});

export class MessageDto extends createZodDto(MessageSchema) {}
