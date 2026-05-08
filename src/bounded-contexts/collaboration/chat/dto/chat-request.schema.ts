import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

// ============================================================================
// Message Schemas
// ============================================================================

const SendMessageSchema = z
  .object({
    recipientId: z.string().min(1, 'Recipient ID is required'),
    content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  })
  .openapi({
    example: {
      recipientId: '01900000-0000-7000-a000-000000000002',
      content: 'Hey, are you available for a quick call this week?',
    },
  });

const SendMessageToConversationSchema = z
  .object({
    content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  })
  .openapi({
    example: {
      content: 'Sounds great, looking forward to it.',
    },
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

const UnblockUserSchema = z.object({ userId: z.string().min(1, 'User ID is required') });

// ============================================================================
// DTOs
// ============================================================================
// Export schemas for custom validation needs
export {
  BlockUserSchema,
  GetConversationsQuerySchema,
  GetMessagesQuerySchema,
  SendMessageSchema,
  SendMessageToConversationSchema,
  UnblockUserSchema,
};

export type SendMessageDto = z.infer<typeof SendMessageSchema>;

export type SendMessageToConversationDto = z.infer<typeof SendMessageToConversationSchema>;

export type GetConversationsQueryDto = z.infer<typeof GetConversationsQuerySchema>;

export type GetMessagesQueryDto = z.infer<typeof GetMessagesQuerySchema>;

export type BlockUserDto = z.infer<typeof BlockUserSchema>;

export type UnblockUserDto = z.infer<typeof UnblockUserSchema>;
