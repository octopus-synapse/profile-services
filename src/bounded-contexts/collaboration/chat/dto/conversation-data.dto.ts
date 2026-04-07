import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ConversationSchema } from './conversation.dto';

const ConversationDataSchema = z.object({
  conversation: ConversationSchema,
});

export class ConversationDataDto extends createZodDto(ConversationDataSchema) {}
