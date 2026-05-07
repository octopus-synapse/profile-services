import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const SendMessageSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
});

export type SendMessage = z.infer<typeof SendMessageSchema>;

export const SendMessageToConversationSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
});

export type SendMessageToConversation = z.infer<typeof SendMessageToConversationSchema>;

export const MarkMessageReadSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
});

export type MarkMessageRead = z.infer<typeof MarkMessageReadSchema>;

export const MarkConversationReadSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
});

export type MarkConversationRead = z.infer<typeof MarkConversationReadSchema>;

export const GetMessagesQuerySchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type GetMessagesQuery = z.infer<typeof GetMessagesQuerySchema>;

export const GetConversationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type GetConversationsQuery = z.infer<typeof GetConversationsQuerySchema>;

export const BlockUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().max(500, 'Reason too long').optional(),
});

export type BlockUser = z.infer<typeof BlockUserSchema>;

export const UnblockUserSchema = z.object({ userId: z.string().min(1, 'User ID is required') });

export type UnblockUser = z.infer<typeof UnblockUserSchema>;

export const WsMessageEventSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  createdAt: IsoDateTimeSchema,
  isRead: z.boolean(),
});

export type WsMessageEvent = z.infer<typeof WsMessageEventSchema>;

export const WsTypingEventSchema = z.object({
  conversationId: z.string(),
  userId: z.string(),
  isTyping: z.boolean(),
});

export type WsTypingEvent = z.infer<typeof WsTypingEventSchema>;

export const WsReadReceiptEventSchema = z.object({
  conversationId: z.string(),
  messageId: z.string(),
  readBy: z.string(),
  readAt: IsoDateTimeSchema,
});

export type WsReadReceiptEvent = z.infer<typeof WsReadReceiptEventSchema>;

export const WsUserStatusEventSchema = z.object({
  userId: z.string(),
  isOnline: z.boolean(),
  lastSeen: IsoDateTimeSchema.optional(),
});

export type WsUserStatusEvent = z.infer<typeof WsUserStatusEventSchema>;

export const MessageResponseSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string(),
  isRead: z.boolean(),
  readAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  sender: z.object({
    id: z.string(),
    name: z.string().nullable(),
    photoURL: z.string().nullable(),
  }),
});

export type MessageResponse = z.infer<typeof MessageResponseSchema>;

/**
 * Conversation Response Schema
 */
export const ConversationResponseSchema = z.object({
  id: z.string(),
  participant: z.object({
    id: z.string(),
    name: z.string().nullable(),
    photoURL: z.string().nullable(),
    username: z.string().nullable(),
  }),
  lastMessage: z
    .object({
      content: z.string(),
      senderId: z.string(),
      createdAt: IsoDateTimeSchema,
      isRead: z.boolean(),
    })
    .nullable(),
  unreadCount: z.number().int().min(0),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;

/**
 * Paginated Messages Response Schema
 */
export const PaginatedMessagesResponseSchema = z.object({
  items: z.array(MessageResponseSchema),
  nextCursor: z.string().nullable(),
  hasNext: z.boolean(),
});

export type PaginatedMessagesResponse = z.infer<typeof PaginatedMessagesResponseSchema>;

/**
 * Paginated Conversations Response Schema
 */
export const PaginatedConversationsResponseSchema = z.object({
  items: z.array(ConversationResponseSchema),
  nextCursor: z.string().nullable(),
  hasNext: z.boolean(),
});

export type PaginatedConversationsResponse = z.infer<typeof PaginatedConversationsResponseSchema>;

/**
 * Blocked User Response Schema
 */
export const BlockedUserResponseSchema = z.object({
  id: z.string(),
  blockedAt: IsoDateTimeSchema,
  reason: z.string().nullable(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    photoURL: z.string().nullable(),
    username: z.string().nullable(),
  }),
});

export type BlockedUserResponse = z.infer<typeof BlockedUserResponseSchema>;

/**
 * Unread Count Response Schema
 */
export const UnreadCountResponseSchema = z.object({
  totalUnread: z.number().int().min(0),
  byConversation: z.record(z.string(), z.number().int().min(0)),
});

export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>;
export type SendMessageDto = z.infer<typeof SendMessageSchema>;

export type SendMessageToConversationDto = z.infer<typeof SendMessageToConversationSchema>;

export type MarkMessageReadDto = z.infer<typeof MarkMessageReadSchema>;

export type MarkConversationReadDto = z.infer<typeof MarkConversationReadSchema>;

export type GetMessagesQueryDto = z.infer<typeof GetMessagesQuerySchema>;

export type GetConversationsQueryDto = z.infer<typeof GetConversationsQuerySchema>;

export type BlockUserDto = z.infer<typeof BlockUserSchema>;

export type UnblockUserDto = z.infer<typeof UnblockUserSchema>;

export type WsMessageEventDto = z.infer<typeof WsMessageEventSchema>;

export type WsTypingEventDto = z.infer<typeof WsTypingEventSchema>;

export type WsReadReceiptEventDto = z.infer<typeof WsReadReceiptEventSchema>;

export type WsUserStatusEventDto = z.infer<typeof WsUserStatusEventSchema>;

export type MessageResponseDto = z.infer<typeof MessageResponseSchema>;

export type ConversationResponseDto = z.infer<typeof ConversationResponseSchema>;

export type PaginatedMessagesResponseDto = z.infer<typeof PaginatedMessagesResponseSchema>;

export type PaginatedConversationsResponseDto = z.infer<
  typeof PaginatedConversationsResponseSchema
>;

export type BlockedUserResponseDto = z.infer<typeof BlockedUserResponseSchema>;

export type UnreadCountResponseDto = z.infer<typeof UnreadCountResponseSchema>;
