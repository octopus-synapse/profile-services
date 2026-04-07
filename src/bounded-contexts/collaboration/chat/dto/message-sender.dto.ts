import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const MessageSenderSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  photoURL: z.string().nullable(),
});

export class MessageSenderDto extends createZodDto(MessageSenderSchema) {}
