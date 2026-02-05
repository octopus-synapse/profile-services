import { z } from "zod";

export const SendMessageSchema = z.object({
 recipientId: z.string().min(1, "Recipient ID is required"),
 content: z
  .string()
  .min(1, "Message cannot be empty")
  .max(5000, "Message too long"),
});

export type SendMessage = z.infer<typeof SendMessageSchema>;

export const SendMessageToConversationSchema = z.object({
 conversationId: z.string().min(1, "Conversation ID is required"),
 content: z
  .string()
  .min(1, "Message cannot be empty")
  .max(5000, "Message too long"),
});

export type SendMessageToConversation = z.infer<
 typeof SendMessageToConversationSchema
>;

export const MarkMessageReadSchema = z.object({
 messageId: z.string().min(1, "Message ID is required"),
});

export type MarkMessageRead = z.infer<typeof MarkMessageReadSchema>;

export const MarkConversationReadSchema = z.object({
 conversationId: z.string().min(1, "Conversation ID is required"),
});

export type MarkConversationRead = z.infer<typeof MarkConversationReadSchema>;

export const GetMessagesQuerySchema = z.object({
 conversationId: z.string().min(1, "Conversation ID is required"),
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
 userId: z.string().min(1, "User ID is required"),
 reason: z.string().max(500, "Reason too long").optional(),
});

export type BlockUser = z.infer<typeof BlockUserSchema>;

export const UnblockUserSchema = z.object({
 userId: z.string().min(1, "User ID is required"),
});

export type UnblockUser = z.infer<typeof UnblockUserSchema>;

export const WsMessageEventSchema = z.object({
 id: z.string(),
 conversationId: z.string(),
 senderId: z.string(),
 content: z.string(),
 createdAt: z.string().datetime(),
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
 readAt: z.string().datetime(),
});

export type WsReadReceiptEvent = z.infer<typeof WsReadReceiptEventSchema>;

export const WsUserStatusEventSchema = z.object({
 userId: z.string(),
 isOnline: z.boolean(),
 lastSeen: z.string().datetime().optional(),
});

export type WsUserStatusEvent = z.infer<typeof WsUserStatusEventSchema>;

export const MessageResponseSchema = z.object({
 id: z.string(),
 conversationId: z.string(),
 senderId: z.string(),
 content: z.string(),
 isRead: z.boolean(),
 readAt: z.string().datetime().nullable(),
 createdAt: z.string().datetime(),
 sender: z.object({
  id: z.string(),
  displayName: z.string().nullable(),
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
  displayName: z.string().nullable(),
  photoURL: z.string().nullable(),
  username: z.string().nullable(),
 }),
 lastMessage: z
  .object({
   content: z.string(),
   senderId: z.string(),
   createdAt: z.string().datetime(),
   isRead: z.boolean(),
  })
  .nullable(),
 unreadCount: z.number().int().min(0),
 createdAt: z.string().datetime(),
 updatedAt: z.string().datetime(),
});

export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;

/**
 * Paginated Messages Response Schema
 */
export const PaginatedMessagesResponseSchema = z.object({
 messages: z.array(MessageResponseSchema),
 nextCursor: z.string().nullable(),
 hasMore: z.boolean(),
});

export type PaginatedMessagesResponse = z.infer<
 typeof PaginatedMessagesResponseSchema
>;

/**
 * Paginated Conversations Response Schema
 */
export const PaginatedConversationsResponseSchema = z.object({
 conversations: z.array(ConversationResponseSchema),
 nextCursor: z.string().nullable(),
 hasMore: z.boolean(),
});

export type PaginatedConversationsResponse = z.infer<
 typeof PaginatedConversationsResponseSchema
>;

/**
 * Blocked User Response Schema
 */
export const BlockedUserResponseSchema = z.object({
 id: z.string(),
 blockedAt: z.string().datetime(),
 reason: z.string().nullable(),
 user: z.object({
  id: z.string(),
  displayName: z.string().nullable(),
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

// ============================================================================
// Simplified Types for Frontend Compatibility
// ============================================================================

/**
 * Simplified Message Type (without populated sender)
 * Used by frontend before migration to MessageResponse
 * @deprecated Use MessageResponse for new code
 */
export const MessageSchema = z.object({
 id: z.string(),
 conversationId: z.string(),
 senderId: z.string(),
 content: z.string(),
 isRead: z.boolean(),
 createdAt: z.string().datetime(),
 updatedAt: z.string().datetime(),
});

export type Message = z.infer<typeof MessageSchema>;

/**
 * Conversation Participant Schema
 */
export const ConversationParticipantSchema = z.object({
 id: z.string(),
 username: z.string(),
 name: z.string().nullable(),
 avatar: z.string().url().nullable(),
});

export type ConversationParticipant = z.infer<
 typeof ConversationParticipantSchema
>;

/**
 * Simplified Conversation Type (with participants array)
 * Used by frontend before migration to ConversationResponse
 * @deprecated Use ConversationResponse for new code
 */
export const ConversationSchema = z.object({
 id: z.string(),
 participants: z.array(ConversationParticipantSchema),
 lastMessage: MessageSchema.nullable(),
 unreadCount: z.number().int().nonnegative(),
 createdAt: z.string().datetime(),
 updatedAt: z.string().datetime(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

/**
 * Paginated Messages (simplified structure)
 * @deprecated Use PaginatedMessagesResponse for new code
 */
export const PaginatedMessagesSchema = z.object({
 data: z.array(MessageSchema),
 cursor: z.string().nullable(),
 hasMore: z.boolean(),
});

export type PaginatedMessages = z.infer<typeof PaginatedMessagesSchema>;

/**
 * Paginated Conversations (simplified structure)
 * @deprecated Use PaginatedConversationsResponse for new code
 */
export const PaginatedConversationsSchema = z.object({
 data: z.array(ConversationSchema),
 total: z.number().int().nonnegative(),
 page: z.number().int().positive(),
 limit: z.number().int().positive(),
 hasMore: z.boolean(),
});

export type PaginatedConversations = z.infer<
 typeof PaginatedConversationsSchema
>;

/**
 * Block User DTO (for backward compatibility)
 */
export const BlockUserDtoSchema = BlockUserSchema.extend({
 blockedUserId: z.string().min(1, "Blocked user ID is required"),
}).omit({ userId: true });

export type BlockUserDto = z.infer<typeof BlockUserDtoSchema>;

/**
 * Blocked User (simplified)
 * @deprecated Use BlockedUserResponse for new code
 */
export const BlockedUserSchema = z.object({
 id: z.string(),
 userId: z.string(),
 blockedUserId: z.string(),
 blockedUser: z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().nullable(),
 }),
 createdAt: z.string().datetime(),
});

export type BlockedUser = z.infer<typeof BlockedUserSchema>;
