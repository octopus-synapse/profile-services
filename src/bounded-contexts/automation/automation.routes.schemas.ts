/**
 * Route descriptors for the automation BC. Replaces `ApplyModeController`
 * (including the `approve` endpoint) and `RageApplyController` — the
 * custom business gates `RequireFitProfileGuard` and
 * `RequireMinQualityGuard` are wired through `Route.guards` against the
 * BC's guard registry, so the descriptors stay framework-free.
 *
 * Both gated routes use `@RequireMinQuality()` defaults (min=50, no
 * resume param) — the `RequireMinQualityGuard` falls back to those when
 * no metadata is set, so we can omit the `metadata` payload.
 */

import { z } from 'zod';

export const ItemIdParam = z.object({ itemId: z.string() });

export const RageApplyBodySchema = z.object({
  minFit: z.coerce.number().int().min(0).max(100).optional(),
  maxApplications: z.coerce.number().int().min(1).max(100).optional(),
  sinceDays: z.coerce.number().int().min(1).max(90).optional(),
});

export type RageApplyBody = z.infer<typeof RageApplyBodySchema>;

// ─── Response schemas ─────────────────────────────────────────────────
export const WeeklyCuratedItemSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  matchScore: z.number(),
  status: z.string(),
  decidedAt: z.string().datetime().nullable(),
});

export const WeeklyCuratedBatchSchema = z.object({
  id: z.string(),
  weekOf: z.string().datetime(),
  sentAt: z.string().datetime().nullable(),
  status: z.string(),
  items: z.array(WeeklyCuratedItemSchema),
});

export const CurrentBatchResponseSchema = z.object({
  batch: WeeklyCuratedBatchSchema.nullable(),
});

export const RejectCuratedItemResponseSchema = z.object({
  itemId: z.string(),
});

export const ApproveCuratedItemResponseSchema = z.object({
  applicationId: z.string(),
  alreadyApplied: z.boolean(),
});

export const RageApplyResponseSchema = z.object({
  attempted: z.number().int().min(0),
  submitted: z.number().int().min(0),
  skippedExisting: z.number().int().min(0),
  failed: z.array(
    z.object({
      jobId: z.string(),
      reason: z.string(),
    }),
  ),
});
