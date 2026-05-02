/**
 * Route descriptors for the admin-collaboration BC. Replaces
 * `AdminChatController` and `AdminCollaborationController`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { AdminCollaborationUseCases } from './application/ports/admin-collaboration.port';

const PageQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

function parsePage(q: z.infer<typeof PageQuerySchema>): {
  page?: number;
  pageSize?: number;
} {
  return {
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  };
}

// ─── Response schemas ─────────────────────────────────────────────────
const ChatStatsResponseSchema = z.object({
  totalConversations: z.number().int().min(0),
  totalMessages: z.number().int().min(0),
  activeConversations: z.number().int().min(0),
  activeChatUsers: z.number().int().min(0),
});

const ChatParticipantSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

const ChatConversationViewSchema = z.object({
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

const PaginatedChatConversationsResponseSchema = z.object({
  items: z.array(ChatConversationViewSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

const CollaborationStatsResponseSchema = z.object({
  totalCollaborations: z.number().int().min(0),
  byRole: z.array(
    z.object({
      role: z.string(),
      count: z.number().int().min(0),
    }),
  ),
});

const CollaboratorUserViewSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

const CollaboratorResumeViewSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
});

const AdminCollaborationViewSchema = z.object({
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

const PaginatedCollaborationsResponseSchema = z.object({
  items: z.array(AdminCollaborationViewSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const adminCollaborationRoutes: ReadonlyArray<Route<AdminCollaborationUseCases>> = [
  // ─── Admin Chat ────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/chat/stats',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_MANAGE,
    response: ChatStatsResponseSchema,
    openapi: {
      summary: 'Get chat statistics',
      tags: ['admin-chat'],
      description: 'Admin Chat API',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => bc.getChatStats.execute(),
  },
  {
    method: 'GET',
    path: '/v1/admin/chat/conversations',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_MANAGE,
    query: PageQuerySchema,
    response: PaginatedChatConversationsResponseSchema,
    openapi: {
      summary: 'List all conversations',
      tags: ['admin-chat'],
      description: 'Admin Chat API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = ctx.query as z.infer<typeof PageQuerySchema>;
      return bc.listChatConversations.execute(parsePage(q));
    },
  },

  // ─── Admin Collaborations ──────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/collaborations/stats',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_MANAGE,
    response: CollaborationStatsResponseSchema,
    openapi: {
      summary: 'Get collaboration statistics',
      tags: ['admin-collaborations'],
      description: 'Admin Collaborations API',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => bc.getCollaborationStats.execute(),
  },
  {
    method: 'GET',
    path: '/v1/admin/collaborations',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_MANAGE,
    query: PageQuerySchema,
    response: PaginatedCollaborationsResponseSchema,
    openapi: {
      summary: 'List all collaborations',
      tags: ['admin-collaborations'],
      description: 'Admin Collaborations API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = ctx.query as z.infer<typeof PageQuerySchema>;
      return bc.listCollaborations.execute(parsePage(q));
    },
  },
];
