/**
 * Route descriptors for the admin-collaboration BC. Replaces
 * `AdminChatController` and `AdminCollaborationController`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import {
  ChatStatsResponseSchema,
  CollaborationStatsResponseSchema,
  PageQuerySchema,
  PaginatedChatConversationsResponseSchema,
  PaginatedCollaborationsResponseSchema,
  parsePage,
  RemoveCollaborationResponseSchema,
  ResumeAndUserIdParams,
} from './admin-collaboration.routes.schemas';
import { AdminCollaborationUseCases } from './application/ports/admin-collaboration.port';

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
  {
    method: 'DELETE',
    path: '/v1/admin/collaborations/:resumeId/:userId',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_MANAGE,
    params: ResumeAndUserIdParams,
    response: RemoveCollaborationResponseSchema,
    openapi: {
      summary: 'Remove a collaborator from a resume (admin)',
      tags: ['admin-collaborations'],
      description: 'Admin Collaborations API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { resumeId, userId } = ctx.params as z.infer<typeof ResumeAndUserIdParams>;
      await bc.removeCollaboration.execute(resumeId, userId);
      return { message: 'Colaboração removida.' };
    },
  },
];
