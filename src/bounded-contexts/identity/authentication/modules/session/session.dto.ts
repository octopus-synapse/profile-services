/**
 * Session DTOs
 *
 * Data transfer objects for session validation endpoint.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const SessionUserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  hasCompletedOnboarding: z.boolean(),
  emailVerified: z.boolean(),
  role: z.enum(['USER', 'ADMIN']),
  roles: z.array(z.string()),
  // Calculated fields - frontend should NOT calculate these
  isAdmin: z.boolean(),
  needsOnboarding: z.boolean(),
  needsEmailVerification: z.boolean(),
});

const SessionResponseSchema = z.object({
  authenticated: z.boolean(),
  user: SessionUserResponseSchema.nullable(),
});

// ============================================================================
// DTOs
// ============================================================================

export class SessionUserResponseDto extends createZodDto(SessionUserResponseSchema) {}
export class SessionResponseDto extends createZodDto(SessionResponseSchema) {}
