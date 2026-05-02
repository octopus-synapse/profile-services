import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const PaginatedResultSchema = z.object({
  data: z.array(z.any()),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
});

const ConnectionUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

const ConnectionDataSchema = z.object({
  id: z.string(),
  requesterId: z.string(),
  targetId: z.string(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']),
  createdAt: z.date(),
  updatedAt: z.date(),
  requester: ConnectionUserSchema.optional(),
  target: ConnectionUserSchema.optional(),
  user: ConnectionUserSchema.optional(),
});

const ConnectionListDataSchema = z.object({ connections: PaginatedResultSchema });

const PendingRequestsDataSchema = z.object({ pendingRequests: PaginatedResultSchema });

const ConnectionStatsSchema = z.object({ connections: z.number().int() });

const ConnectionCheckSchema = z.object({
  isConnected: z.boolean(),
  pendingSentConnectionId: z.string().nullable(),
});

const SuggestionUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
  reason: z.string(),
  score: z.number(),
  mutualCount: z.number().int(),
  commonSkills: z.array(z.string()),
});

const SuggestionsDataSchema = z.object({
  suggestions: PaginatedResultSchema.extend({ data: z.array(SuggestionUserSchema) }),
});

const NetworkSummaryStatsSchema = z.object({
  connections: z.number().int(),
  followers: z.number().int(),
  following: z.number().int(),
  pendingInvitations: z.number().int(),
});

const NetworkSummaryDataSchema = z.object({
  stats: NetworkSummaryStatsSchema,
  pendingRequests: PaginatedResultSchema,
  connections: PaginatedResultSchema,
  suggestions: PaginatedResultSchema.extend({ data: z.array(SuggestionUserSchema) }),
});

// ============================================================================
// DTOs
// ============================================================================

export type ConnectionUserDto = z.infer<typeof ConnectionUserSchema>;

export type ConnectionDataDto = z.infer<typeof ConnectionDataSchema>;

export type ConnectionListDataDto = z.infer<typeof ConnectionListDataSchema>;

export type PendingRequestsDataDto = z.infer<typeof PendingRequestsDataSchema>;

export type ConnectionStatsDto = z.infer<typeof ConnectionStatsSchema>;

export type ConnectionCheckDto = z.infer<typeof ConnectionCheckSchema>;

export type SuggestionUserDto = z.infer<typeof SuggestionUserSchema>;

export type SuggestionsDataDto = z.infer<typeof SuggestionsDataSchema>;

export type NetworkSummaryStatsDto = z.infer<typeof NetworkSummaryStatsSchema>;

export type NetworkSummaryDataDto = z.infer<typeof NetworkSummaryDataSchema>;
