import { z } from 'zod';
import { MessageSchema } from './message.schema';

const ChatMessageDataSchema = z.object({ message: MessageSchema });

export type ChatMessageDataDto = z.infer<typeof ChatMessageDataSchema>;
