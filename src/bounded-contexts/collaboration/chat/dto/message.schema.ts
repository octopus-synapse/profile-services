import { z } from 'zod';
import { MessageSenderSchema } from './message-sender.schema';

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

export type MessageDto = z.infer<typeof MessageSchema>;
