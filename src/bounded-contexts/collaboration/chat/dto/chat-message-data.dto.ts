import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MessageSchema } from './message.dto';

const ChatMessageDataSchema = z.object({
  message: MessageSchema,
});

export class ChatMessageDataDto extends createZodDto(ChatMessageDataSchema) {}
