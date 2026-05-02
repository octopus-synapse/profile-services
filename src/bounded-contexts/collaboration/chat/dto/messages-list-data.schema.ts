import { z } from 'zod';
import { PaginatedMessagesSchema } from './paginated-messages.schema';

const MessagesListDataSchema = z.object({ messages: PaginatedMessagesSchema });

export type MessagesListDataDto = z.infer<typeof MessagesListDataSchema>;
