import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// --- Chat Stats ---

const AdminChatStatsDataSchema = z.object({
  totalConversations: z.number().int(),
  totalMessages: z.number().int(),
  activeConversations: z.number().int(),
  activeChatUsers: z.number().int(),
});

export class AdminChatStatsDataDto extends createZodDto(AdminChatStatsDataSchema) {}

// --- Chat Conversations (paginated) ---

const ConversationParticipantSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

const ConversationItemSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  participant1Id: z.string(),
  participant2Id: z.string(),
  participant1: ConversationParticipantSchema,
  participant2: ConversationParticipantSchema,
  lastMessageContent: z.string().nullable(),
  lastMessageAt: z.string().datetime().nullable(),
  lastMessageSenderId: z.string().nullable(),
});

const AdminChatConversationsDataSchema = z.object({
  items: z.array(ConversationItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export class AdminChatConversationsDataDto extends createZodDto(AdminChatConversationsDataSchema) {}
