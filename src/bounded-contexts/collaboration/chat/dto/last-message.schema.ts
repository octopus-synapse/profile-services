import { z } from 'zod';

export const LastMessageSchema = z.object({
  content: z.string(),
  senderId: z.string(),
  createdAt: z.string(),
  isRead: z.boolean(),
});

export type LastMessageDto = z.infer<typeof LastMessageSchema>;
