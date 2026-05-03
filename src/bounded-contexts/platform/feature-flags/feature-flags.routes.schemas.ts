/**
 * Route descriptors for the feature-flags BC. Replaces
 * `AdminFeatureFlagsController` and the entire `FeatureFlagsController`
 * (including the SSE `subscribe` endpoint, now declared as a
 * `kind: 'sse'` Route descriptor and wired through a dedicated
 * `FeatureFlagsSseBundle`).
 */

import type { Observable } from 'rxjs';
import { z } from 'zod';
import type { FlagStreamMessage } from './infrastructure/sse/sse-flag-stream.service';

/**
 * Bundle for the feature-flags SSE route. Holds the local hub that
 * fans out flag-invalidate broadcasts to connected clients (wired in
 * `feature-flags.module.ts`).
 */
export abstract class FeatureFlagsSseBundle {
  abstract readonly flagStream: { observe(): Observable<FlagStreamMessage> };
}

export const KeyParam = z.object({ key: z.string() });

export const ToggleFeatureFlagSchema = z
  .object({
    enabled: z.boolean().optional(),
    enabledForRoles: z.array(z.string()).optional(),
  })
  .strict();

export const ActiveFlagsResponseSchema = z.object({
  flags: z.record(z.boolean()),
});

// ─── Admin response schemas ────────────────────────────────────────
export const FlagAdminRowSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  enabledForRoles: z.array(z.string()),
  deprecated: z.boolean(),
  dependsOn: z.array(z.string()),
  effectiveGlobal: z.boolean(),
  blockedBy: z.array(z.string()),
});

export const ListFlagsResponseSchema = z.object({
  flags: z.array(FlagAdminRowSchema),
});

// `FlagImpactTree` is genuinely recursive (a key plus children of the same
// shape). Swagger's `zod-to-openapi` generator doesn't handle `z.lazy`, so
// we serialise the recursion explicitly with bounded depth. Production
// trees are dependency DAGs of feature flags — the seeded set is two
// layers deep, so 5 levels is roomy.
export const ImpactTreeLeafSchema = z.object({
  key: z.string(),
  children: z.array(z.object({ key: z.string() })),
});
export const ImpactTreeDepth3Schema = z.object({
  key: z.string(),
  children: z.array(ImpactTreeLeafSchema),
});
export const ImpactTreeDepth4Schema = z.object({
  key: z.string(),
  children: z.array(ImpactTreeDepth3Schema),
});
export const ImpactTreeDepth5Schema = z.object({
  key: z.string(),
  children: z.array(ImpactTreeDepth4Schema),
});
export const ImpactTreeSchema = z.object({
  key: z.string(),
  children: z.array(ImpactTreeDepth5Schema),
});

export const ImpactResponseSchema = z.object({ tree: ImpactTreeSchema });

export const ToggleFlagResponseSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  enabledForRoles: z.array(z.string()),
  deprecated: z.boolean(),
  dependsOn: z.array(z.string()),
  blockedBy: z.array(z.string()),
  effectiveGlobal: z.boolean(),
});

export const BroadcastRefreshResponseSchema = z.object({}).strict();
