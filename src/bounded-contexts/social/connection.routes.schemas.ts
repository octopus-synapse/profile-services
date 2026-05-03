/**
 * Route descriptors for the social BC's connection (LinkedIn-style)
 * surface. Replaces `ConnectionController`. The bundle wraps the two
 * services the legacy controller injected (`ConnectionService`,
 * `FollowService`).
 */

import { z } from 'zod';
import type { ConnectionService } from './services/connection.service';
import type { FollowService } from './services/follow.service';

export abstract class ConnectionRoutesBundle {
  abstract readonly connectionService: ConnectionService;
  abstract readonly followService: FollowService;
}

export const UserIdParam = z.object({ userId: z.string() });
export const IdParam = z.object({ id: z.string() });
export const PageQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export function num(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function paginate(
  q: { page?: string; limit?: string },
  defaults: { page?: number; limit?: number; cap?: number } = {},
): { page: number; limit: number } {
  return {
    page: num(q.page, defaults.page ?? 1),
    limit: Math.min(num(q.limit, defaults.limit ?? 10), defaults.cap ?? 100),
  };
}

// ─── Response schemas ─────────────────────────────────────────────────
export const ConnectionUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

export const ConnectionWithUserSchema = z.object({
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

export const ConnectionSuggestionSchema = z.object({
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
export const ConnectionPaginatedSchema = z.object({
  data: z.array(ConnectionWithUserSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

export const SuggestionsPaginatedSchema = z.object({
  data: z.array(ConnectionSuggestionSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

export const NetworkSummaryResponseSchema = z.object({
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

export const ConnectionIdResponseSchema = z.object({ id: z.string() });

export const ConnectionRemovedResponseSchema = z.object({ removed: z.literal(true) });

export const ConnectionsListResponseSchema = z.object({ connections: ConnectionPaginatedSchema });

export const PendingRequestsListResponseSchema = z.object({
  pendingRequests: ConnectionPaginatedSchema,
});

export const SuggestionsListResponseSchema = z.object({ suggestions: SuggestionsPaginatedSchema });

export const ConnectionStatsResponseSchema = z.object({ connections: z.number().int() });

export const ConnectionStatusResponseSchema = z.object({
  isConnected: z.boolean(),
  pendingSentConnectionId: z.string().nullable(),
});
