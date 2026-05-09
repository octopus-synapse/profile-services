import { z } from 'zod';

export const ConversationParticipantSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  photoURL: z.string().nullable(),
  username: z.string().nullable(),
});

export type ConversationParticipantDto = z.infer<typeof ConversationParticipantSchema>;
