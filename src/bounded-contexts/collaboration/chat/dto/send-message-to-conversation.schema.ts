import { z } from 'zod';

export const SendMessageToConversationSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
});

export type SendMessageToConversationDto = z.infer<typeof SendMessageToConversationSchema>;
