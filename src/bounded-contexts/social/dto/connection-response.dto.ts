/**
 * Connection Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
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
});

const ConnectionListDataSchema = z.object({
  connections: PaginatedResultSchema,
});

const PendingRequestsDataSchema = z.object({
  pendingRequests: PaginatedResultSchema,
});

const ConnectionStatsSchema = z.object({
  connections: z.number().int(),
});

const ConnectionCheckSchema = z.object({
  isConnected: z.boolean(),
});

const SuggestionUserSchema = ConnectionUserSchema;

const SuggestionsDataSchema = z.object({
  suggestions: z.array(SuggestionUserSchema),
});

// ============================================================================
// DTOs
// ============================================================================

export class ConnectionDataDto extends createZodDto(ConnectionDataSchema) {}
export class ConnectionListDataDto extends createZodDto(ConnectionListDataSchema) {}
export class PendingRequestsDataDto extends createZodDto(PendingRequestsDataSchema) {}
export class ConnectionStatsDto extends createZodDto(ConnectionStatsSchema) {}
export class ConnectionCheckDto extends createZodDto(ConnectionCheckSchema) {}
export class SuggestionsDataDto extends createZodDto(SuggestionsDataSchema) {}
