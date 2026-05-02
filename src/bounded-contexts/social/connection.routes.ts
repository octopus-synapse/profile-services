/**
 * Route descriptors for the social BC's connection (LinkedIn-style)
 * surface. Replaces `ConnectionController`. The bundle wraps the two
 * services the legacy controller injected (`ConnectionService`,
 * `FollowService`).
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import type { ConnectionService } from './services/connection.service';
import type { FollowService } from './services/follow.service';

export abstract class ConnectionRoutesBundle {
  abstract readonly connectionService: ConnectionService;
  abstract readonly followService: FollowService;
}

const UserIdParam = z.object({ userId: z.string() });
const IdParam = z.object({ id: z.string() });
const PageQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

function num(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function paginate(
  q: { page?: string; limit?: string },
  defaults: { page?: number; limit?: number; cap?: number } = {},
): { page: number; limit: number } {
  return {
    page: num(q.page, defaults.page ?? 1),
    limit: Math.min(num(q.limit, defaults.limit ?? 10), defaults.cap ?? 100),
  };
}

// ─── Response schemas ─────────────────────────────────────────────────
const ConnectionUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

const ConnectionWithUserSchema = z.object({
  id: z.string(),
  requesterId: z.string(),
  targetId: z.string(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  requester: ConnectionUserSchema.optional(),
  target: ConnectionUserSchema.optional(),
  user: ConnectionUserSchema.optional(),
});

const ConnectionSuggestionSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
  reason: z.string(),
  score: z.number(),
  mutualCount: z.number().int(),
  commonSkills: z.array(z.string()),
});

/**
 * Legacy paginated shape returned by `ConnectionService` —
 * `{data, total, page, limit, totalPages}`. Distinct from the canonical
 * `{items, total, page, limit, totalPages, hasNext, hasPrev}` response
 * because the service hasn't been migrated yet; the schema mirrors the
 * actual JSON the handler emits.
 */
const ConnectionPaginatedSchema = z.object({
  data: z.array(ConnectionWithUserSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

const SuggestionsPaginatedSchema = z.object({
  data: z.array(ConnectionSuggestionSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

const NetworkSummaryResponseSchema = z.object({
  stats: z.object({
    connections: z.number().int(),
    followers: z.number().int(),
    following: z.number().int(),
    pendingInvitations: z.number().int(),
  }),
  pendingRequests: ConnectionPaginatedSchema,
  connections: ConnectionPaginatedSchema,
  suggestions: SuggestionsPaginatedSchema,
});

const ConnectionIdResponseSchema = z.object({ id: z.string() });

const ConnectionRemovedResponseSchema = z.object({ removed: z.literal(true) });

const ConnectionsListResponseSchema = z.object({ connections: ConnectionPaginatedSchema });

const PendingRequestsListResponseSchema = z.object({
  pendingRequests: ConnectionPaginatedSchema,
});

const SuggestionsListResponseSchema = z.object({ suggestions: SuggestionsPaginatedSchema });

const ConnectionStatsResponseSchema = z.object({ connections: z.number().int() });

const ConnectionStatusResponseSchema = z.object({
  isConnected: z.boolean(),
  pendingSentConnectionId: z.string().nullable(),
});

export const connectionRoutes: ReadonlyArray<Route<ConnectionRoutesBundle>> = [
  {
    method: 'GET',
    path: '/v1/users/me/network-summary',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    response: NetworkSummaryResponseSchema,
    openapi: {
      summary: 'Get network summary for authenticated user',
      tags: ['social-connections'],
    },
    handler: async (ctx, bundle) => {
      const userId = ctx.user!.userId;
      const defaultPagination = { page: 1, limit: 10 };

      const [pendingRequests, connections, suggestions, socialStats, pendingCount] =
        await Promise.all([
          bundle.connectionService.getPendingRequests(userId, defaultPagination),
          bundle.connectionService.getConnections(userId, defaultPagination),
          bundle.connectionService.getConnectionSuggestions(userId, { page: 1, limit: 20 }),
          bundle.followService.getSocialStats(userId),
          bundle.connectionService.getPendingRequests(userId, { page: 1, limit: 1 }),
        ]);

      return {
        stats: {
          connections: socialStats.connections,
          followers: socialStats.followers,
          following: socialStats.following,
          pendingInvitations: pendingCount.total,
        },
        pendingRequests,
        connections,
        suggestions,
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/users/:userId/connect',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: UserIdParam,
    response: ConnectionIdResponseSchema,
    openapi: {
      summary: 'Send a connection request',
      tags: ['social-connections'],
    },
    handler: async (ctx, bundle) => {
      const { userId: targetUserId } = ctx.params as { userId: string };
      const connection = await bundle.connectionService.sendConnectionRequest(
        ctx.user!.userId,
        targetUserId,
      );
      return { id: connection.id };
    },
  },
  {
    method: 'PUT',
    path: '/v1/connections/:id/accept',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: IdParam,
    response: ConnectionIdResponseSchema,
    openapi: {
      summary: 'Accept a connection request',
      tags: ['social-connections'],
    },
    handler: async (ctx, bundle) => {
      const { id: connectionId } = ctx.params as { id: string };
      const connection = await bundle.connectionService.acceptConnection(
        connectionId,
        ctx.user!.userId,
      );
      return { id: connection.id };
    },
  },
  {
    method: 'PUT',
    path: '/v1/connections/:id/reject',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: IdParam,
    response: ConnectionIdResponseSchema,
    openapi: {
      summary: 'Reject a connection request',
      tags: ['social-connections'],
    },
    handler: async (ctx, bundle) => {
      const { id: connectionId } = ctx.params as { id: string };
      const connection = await bundle.connectionService.rejectConnection(
        connectionId,
        ctx.user!.userId,
      );
      return { id: connection.id };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/connections/:id/withdraw',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: IdParam,
    response: ConnectionIdResponseSchema,
    openapi: {
      summary: 'Withdraw a sent (pending) connection request',
      tags: ['social-connections'],
    },
    handler: async (ctx, bundle) => {
      const { id: connectionId } = ctx.params as { id: string };
      await bundle.connectionService.withdrawSentRequest(connectionId, ctx.user!.userId);
      return { id: connectionId };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/connections/:id',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: IdParam,
    response: ConnectionRemovedResponseSchema,
    openapi: {
      summary: 'Remove a connection',
      tags: ['social-connections'],
    },
    handler: async (ctx, bundle) => {
      const { id: connectionId } = ctx.params as { id: string };
      await bundle.connectionService.removeConnection(connectionId, ctx.user!.userId);
      return { removed: true };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/me/connections',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    query: PageQuery,
    response: ConnectionsListResponseSchema,
    openapi: {
      summary: 'Get accepted connections',
      tags: ['social-connections'],
    },
    handler: async (ctx, bundle) => {
      const pagination = paginate(ctx.query as z.infer<typeof PageQuery>);
      const result = await bundle.connectionService.getConnections(ctx.user!.userId, pagination);
      return { connections: result };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/me/connections/pending',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    query: PageQuery,
    response: PendingRequestsListResponseSchema,
    openapi: {
      summary: 'Get pending connection requests',
      tags: ['social-connections'],
    },
    handler: async (ctx, bundle) => {
      const pagination = paginate(ctx.query as z.infer<typeof PageQuery>);
      const result = await bundle.connectionService.getPendingRequests(
        ctx.user!.userId,
        pagination,
      );
      return { pendingRequests: result };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/me/connections/sent',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    query: PageQuery,
    response: PendingRequestsListResponseSchema,
    openapi: {
      summary: 'Get sent (pending) connection requests',
      tags: ['social-connections'],
    },
    handler: async (ctx, bundle) => {
      const pagination = paginate(ctx.query as z.infer<typeof PageQuery>);
      const result = await bundle.connectionService.getSentRequests(ctx.user!.userId, pagination);
      return { pendingRequests: result };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/me/connections/suggestions',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    query: PageQuery,
    response: SuggestionsListResponseSchema,
    openapi: {
      summary: 'Get connection suggestions',
      tags: ['social-connections'],
    },
    handler: async (ctx, bundle) => {
      const pagination = paginate(ctx.query as z.infer<typeof PageQuery>, {
        limit: 20,
        cap: 20,
      });
      const suggestions = await bundle.connectionService.getConnectionSuggestions(
        ctx.user!.userId,
        pagination,
      );
      return { suggestions };
    },
  },
  {
    method: 'GET',
    path: '/v1/users/:userId/connection-stats',
    auth: { kind: 'public' },
    params: UserIdParam,
    response: ConnectionStatsResponseSchema,
    openapi: {
      summary: 'Get connection stats for a user',
      tags: ['social-connections'],
    },
    handler: async (ctx, bundle) => {
      const { userId } = ctx.params as { userId: string };
      const stats = await bundle.connectionService.getConnectionStats(userId);
      return stats;
    },
  },
  {
    method: 'GET',
    path: '/v1/users/:userId/is-connected',
    auth: { kind: 'jwt' },
    permission: Permission.SOCIAL_USE,
    params: UserIdParam,
    response: ConnectionStatusResponseSchema,
    openapi: {
      summary: 'Check connection status',
      tags: ['social-connections'],
    },
    handler: async (ctx, bundle) => {
      const { userId: targetUserId } = ctx.params as { userId: string };
      const status = await bundle.connectionService.getConnectionStatusWith(
        ctx.user!.userId,
        targetUserId,
      );
      return status;
    },
  },
];
