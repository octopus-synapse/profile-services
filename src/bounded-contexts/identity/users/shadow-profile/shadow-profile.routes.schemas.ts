/**
 * Route descriptors for the shadow-profile BC. Replaces
 * `ShadowProfileController`.
 */

import { z } from 'zod';
import { IdParamSchema } from '@/shared-kernel/schemas/params';

export const UpsertGithubBody = z
  .object({
    token: z.string(),
    username: z.string(),
  })
  .openapi({
    example: {
      token: 'ghp_exampletokenvalueforgithubapi1234567',
      username: 'octocat',
    },
  });

export const FindCandidatesQuery = z.object({
  email: z.string().optional(),
  githubLogin: z.string().optional(),
});

export const ShadowProfileIdParam = IdParamSchema;

// ─── Response schemas ────────────────────────────────────────────────
// `payload` is the Prisma Json column carrying the shadow-payload
// produced by `buildShadowPayload`. Modelled as `passthrough()` so we
// stay schema-driven without falling back to `z.unknown()`.
export const ShadowProfileSnapshotSchema = z.object({
  id: z.string(),
  source: z.string(),
  externalHandle: z.string(),
  contactEmail: z.string().nullable(),
  payload: z.object({}).passthrough().nullable(),
  claimedByUserId: z.string().uuid().nullable(),
});

export const FindCandidatesResponseSchema = z.object({
  candidates: z.array(ShadowProfileSnapshotSchema),
});
