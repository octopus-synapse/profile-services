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
  roles: z.array(z.string()), // Calculated fields - frontend should NOT calculate these
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

export type SessionUserResponseDto = z.infer<typeof SessionUserResponseSchema>;

export type SessionResponseDto = z.infer<typeof SessionResponseSchema>;
