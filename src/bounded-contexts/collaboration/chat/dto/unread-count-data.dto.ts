import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UnreadCountDataSchema = z.object({
  totalUnread: z.number().int(),
  byConversation: z.record(z.number().int()),
});

export class UnreadCountDataDto extends createZodDto(UnreadCountDataSchema) {}
