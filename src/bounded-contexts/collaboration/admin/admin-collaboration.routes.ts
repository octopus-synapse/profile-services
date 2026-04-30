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

export const adminCollaborationRoutes: ReadonlyArray<Route<AdminCollaborationUseCases>> = [
  // ─── Admin Chat ────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/admin/chat/stats',
    auth: { kind: 'jwt' },
    permission: Permission.PLATFORM_MANAGE,
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
