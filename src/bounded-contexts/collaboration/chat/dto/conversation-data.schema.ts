import { z } from 'zod';
import { ConversationSchema } from './conversation.schema';

const ConversationDataSchema = z.object({ conversation: ConversationSchema });

export type ConversationDataDto = z.infer<typeof ConversationDataSchema>;
