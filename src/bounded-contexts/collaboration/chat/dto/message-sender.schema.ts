import { z } from 'zod';

export const MessageSenderSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  photoURL: z.string().nullable(),
});

export type MessageSenderDto = z.infer<typeof MessageSenderSchema>;
