import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SendMessageToConversationSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
});

export class SendMessageToConversationDto extends createZodDto(SendMessageToConversationSchema) {}
