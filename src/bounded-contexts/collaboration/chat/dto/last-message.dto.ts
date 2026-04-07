import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const LastMessageSchema = z.object({
  content: z.string(),
  senderId: z.string(),
  createdAt: z.string(),
  isRead: z.boolean(),
});

export class LastMessageDto extends createZodDto(LastMessageSchema) {}
