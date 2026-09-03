/**
 * Route descriptors for the admin-collaboration BC. The chat moderation
 * half (`/v1/admin/chat/*`) was removed with the rest of the surface no
 * screen called (ADR-005).
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import {
  CollaborationStatsResponseSchema,
  PageQuerySchema,
  PaginatedCollaborationsResponseSchema,
  parsePage,
  RemoveCollaborationResponseSchema,
  ResumeAndUserIdParams,
} from './admin-collaboration.routes.schemas';
import { AdminCollaborationUseCases } from './application/ports/admin-collaboration.port';

export const adminCollaborationRoutes: ReadonlyArray<Route<AdminCollaborationUseCases>> = [
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
