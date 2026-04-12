import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ConversationParticipantSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  photoURL: z.string().nullable(),
  username: z.string().nullable(),
});

export class ConversationParticipantDto extends createZodDto(ConversationParticipantSchema) {}
