import { z } from 'zod';

const UnreadCountDataSchema = z.object({
  totalUnread: z.number().int(),
  byConversation: z.record(z.number().int()),
});

export type UnreadCountDataDto = z.infer<typeof UnreadCountDataSchema>;
