/**
 * Route descriptors for the social BC's connection (LinkedIn-style)
 * surface. Replaces `ConnectionController`. The bundle wraps the two
 * services the legacy controller injected (`ConnectionService`,
 * `FollowService`).
 */

import { z } from 'zod';
import {
  PaginatedResponseSchema,
  PaginationQuerySchema,
} from '@/shared-kernel/schemas/common/api.types';
import { IdParamSchema, UserIdParamSchema } from '@/shared-kernel/schemas/params';
import type { ConnectionService } from './services/connection.service';
import type { FollowService } from './services/follow.service';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export abstract class ConnectionRoutesBundle {
  abstract readonly connectionService: ConnectionService;
  abstract readonly followService: FollowService;
}

export const UserIdParam = UserIdParamSchema;
export const IdParam = IdParamSchema;
export const PageQuery = PaginationQuerySchema;

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
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
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

export const ConnectionPaginatedSchema = PaginatedResponseSchema(ConnectionWithUserSchema);

export const SuggestionsPaginatedSchema = PaginatedResponseSchema(ConnectionSuggestionSchema);

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

export const ConnectionIdResponseSchema = IdParamSchema;

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
