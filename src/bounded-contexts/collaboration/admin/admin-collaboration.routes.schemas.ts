/**
 * Route descriptors for the admin-collaboration BC. Replaces
 * `AdminChatController` and `AdminCollaborationController`.
 */

import { z } from 'zod';
import { parsePositiveIntParam } from '@/shared-kernel/http/query-parsers';
import { PaginatedResponseSchema } from '@/shared-kernel/schemas/common/api.types';

/**
 * Admin pagination uses `pageSize` instead of `limit` (legacy alias).
 * Kept as an extension of the canonical schema rather than reverting
 * to bespoke field names.
 */
export const PageQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

export function parsePage(q: z.infer<typeof PageQuerySchema>): {
  page?: number;
  pageSize?: number;
} {
  return {
    page: q.page ? parsePositiveIntParam(q.page, 1) : undefined,
    pageSize: q.pageSize ? parsePositiveIntParam(q.pageSize, 20, 100) : undefined,
  };
}

// ─── Response schemas ─────────────────────────────────────────────────
export const ChatStatsResponseSchema = z.object({
  totalConversations: z.number().int().min(0),
  totalMessages: z.number().int().min(0),
  activeConversations: z.number().int().min(0),
  activeChatUsers: z.number().int().min(0),
});

export const ChatParticipantSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

export const ChatConversationViewSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  participant1Id: z.string(),
  participant2Id: z.string(),
  participant1: ChatParticipantSchema,
  participant2: ChatParticipantSchema,
  lastMessageContent: z.string().nullable(),
  lastMessageAt: z.string().datetime().nullable(),
  lastMessageSenderId: z.string().nullable(),
});

export const PaginatedChatConversationsResponseSchema =
  PaginatedResponseSchema(ChatConversationViewSchema);

export const CollaborationStatsResponseSchema = z.object({
  totalCollaborations: z.number().int().min(0),
  byRole: z.array(
    z.object({
      role: z.string(),
      count: z.number().int().min(0),
    }),
  ),
});

export const CollaboratorUserViewSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

export const CollaboratorResumeViewSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
});

export const AdminCollaborationViewSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  userId: z.string(),
  role: z.string(),
  invitedBy: z.string(),
  invitedAt: z.string().datetime(),
  joinedAt: z.string().datetime().nullable(),
  user: CollaboratorUserViewSchema,
  resume: CollaboratorResumeViewSchema,
});

export const PaginatedCollaborationsResponseSchema =
  PaginatedResponseSchema(AdminCollaborationViewSchema);

export const ResumeAndUserIdParams = z.object({
  resumeId: z.string(),
  userId: z.string(),
});

export const RemoveCollaborationResponseSchema = z.object({
  message: z.string(),
});
