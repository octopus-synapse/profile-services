/**
 * Route descriptors for the social BC's connection (LinkedIn-style)
 * surface. Replaces `ConnectionController`. The bundle wraps the two
 * services the legacy controller injected (`ConnectionService`,
 * `FollowService`).
 */

import { z } from 'zod';
import { PaginatedResponseSchema } from '@/shared-kernel/schemas/common/api.types';
import { IdParamSchema, UserIdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { LimitSchema, PageSchema } from '@/shared-kernel/schemas/primitives/pagination.schema';
import type { ConnectionService } from './services/connection.service';
import type { FollowService } from './services/follow.service';

export abstract class ConnectionRoutesBundle {
  abstract readonly connectionService: ConnectionService;
  abstract readonly followService: FollowService;
}

export const UserIdParam = UserIdParamSchema;
export const IdParam = IdParamSchema;
// P1 #34 — connection listing routes do not accept `sortBy`. Build
// the schema without it so an unrecognised query param is a 400 at
// the schema layer rather than silently ignored by the use case.
export const PageQuery = z.object({ page: PageSchema, limit: LimitSchema });

// ─── Response schemas ─────────────────────────────────────────────────
export const ConnectionUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

export const ConnectionWithUserSchema = z.object({
  id: z.string(),
  requesterId: z.string().uuid(),
  targetId: z.string().uuid(),
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

export const ConnectionsListResponseSchema = ConnectionPaginatedSchema;

export const PendingRequestsListResponseSchema = ConnectionPaginatedSchema;

export const SuggestionsListResponseSchema = SuggestionsPaginatedSchema;

export const ConnectionStatsResponseSchema = z.object({ connections: z.number().int() });

export const ConnectionStatusResponseSchema = z.object({
  isConnected: z.boolean(),
  pendingSentConnectionId: z.string().uuid().nullable(),
});
