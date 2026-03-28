/**
 * Chat Response DTOs
 *
 * Data Transfer Objects for chat API responses.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Base Schemas
// ============================================================================

const MessageSenderSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  photoURL: z.string().nullable(),
});

const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  isRead: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
  sender: MessageSenderSchema,
});

const ConversationParticipantSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  photoURL: z.string().nullable(),
  username: z.string().nullable(),
});

const LastMessageSchema = z.object({
  content: z.string(),
  senderId: z.string(),
  createdAt: z.string(),
  isRead: z.boolean(),
});

const ConversationSchema = z.object({
  id: z.string(),
  participant: ConversationParticipantSchema,
  lastMessage: LastMessageSchema.nullable(),
  unreadCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================================================
// Paginated Schemas
// ============================================================================

const PaginatedMessagesSchema = z.object({
  messages: z.array(MessageSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

const PaginatedConversationsSchema = z.object({
  conversations: z.array(ConversationSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

// ============================================================================
// Response Wrapper Schemas
// ============================================================================

const ChatMessageDataSchema = z.object({
  message: MessageSchema,
});

const ConversationsListDataSchema = z.object({
  conversations: PaginatedConversationsSchema,
});

const ConversationDataSchema = z.object({
  conversation: ConversationSchema,
});

const MessagesListDataSchema = z.object({
  messages: PaginatedMessagesSchema,
});

const MarkAsReadDataSchema = z.object({
  count: z.number().int(),
});

const UnreadCountDataSchema = z.object({
  totalUnread: z.number().int(),
  byConversation: z.record(z.number().int()),
});

const ConversationNullableDataSchema = z.object({
  conversationId: z.string().nullable(),
  conversation: ConversationSchema.nullable().optional(),
});

// ============================================================================
// DTOs
// ============================================================================

export class MessageSenderDto extends createZodDto(MessageSenderSchema) {}
export class MessageDto extends createZodDto(MessageSchema) {}
export class ConversationParticipantDto extends createZodDto(ConversationParticipantSchema) {}
export class LastMessageDto extends createZodDto(LastMessageSchema) {}
export class ConversationDto extends createZodDto(ConversationSchema) {}
export class PaginatedMessagesDto extends createZodDto(PaginatedMessagesSchema) {}
export class PaginatedConversationsDto extends createZodDto(PaginatedConversationsSchema) {}
export class ChatMessageDataDto extends createZodDto(ChatMessageDataSchema) {}
export class ConversationsListDataDto extends createZodDto(ConversationsListDataSchema) {}
export class ConversationDataDto extends createZodDto(ConversationDataSchema) {}
export class MessagesListDataDto extends createZodDto(MessagesListDataSchema) {}
export class MarkAsReadDataDto extends createZodDto(MarkAsReadDataSchema) {}
export class UnreadCountDataDto extends createZodDto(UnreadCountDataSchema) {}
export class ConversationNullableDataDto extends createZodDto(ConversationNullableDataSchema) {}
