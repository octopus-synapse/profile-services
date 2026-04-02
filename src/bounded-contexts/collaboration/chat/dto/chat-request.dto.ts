/**
 * Chat Request DTOs
 *
 * Request DTOs for chat API endpoints using createZodDto pattern.
 * Provides: TypeScript types + Zod validation + Swagger docs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Message Schemas
// ============================================================================

const SendMessageSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
});

const SendMessageToConversationSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
});

// ============================================================================
// Query Schemas
// ============================================================================

const GetConversationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const GetMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ============================================================================
// Block/Unblock Schemas
// ============================================================================

const BlockUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().max(500, 'Reason too long').optional(),
});

const UnblockUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

// ============================================================================
// DTOs
// ============================================================================

export class SendMessageDto extends createZodDto(SendMessageSchema) {}
export class SendMessageToConversationDto extends createZodDto(SendMessageToConversationSchema) {}
export class GetConversationsQueryDto extends createZodDto(GetConversationsQuerySchema) {}
export class GetMessagesQueryDto extends createZodDto(GetMessagesQuerySchema) {}
export class BlockUserDto extends createZodDto(BlockUserSchema) {}
export class UnblockUserDto extends createZodDto(UnblockUserSchema) {}

// Export schemas for custom validation needs
export {
  BlockUserSchema,
  GetConversationsQuerySchema,
  GetMessagesQuerySchema,
  SendMessageSchema,
  SendMessageToConversationSchema,
  UnblockUserSchema,
};
