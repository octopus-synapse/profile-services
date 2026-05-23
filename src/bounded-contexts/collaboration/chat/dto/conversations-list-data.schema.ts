import { z } from 'zod';
import { PaginatedConversationsSchema } from './paginated-conversations.schema';

const ConversationsListDataSchema = z.object({ conversations: PaginatedConversationsSchema });

export type ConversationsListDataDto = z.infer<typeof ConversationsListDataSchema>;
