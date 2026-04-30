/**
 * Route descriptors for the feature-flags BC. Replaces
 * `AdminFeatureFlagsController` and the entire `FeatureFlagsController`
 * (including the SSE `subscribe` endpoint, now declared as a
 * `kind: 'sse'` Route descriptor and wired through a dedicated
 * `FeatureFlagsSseBundle`).
 */

import type { Observable } from 'rxjs';
import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { FeatureFlagsUseCases } from './application/ports/feature-flags.port';
import type { FlagStreamMessage } from './infrastructure/sse/sse-flag-stream.service';

/**
 * Bundle for the feature-flags SSE route. Holds the local hub that
 * fans out flag-invalidate broadcasts to connected clients (wired in
 * `feature-flags.module.ts`).
 */
export abstract class FeatureFlagsSseBundle {
  abstract readonly flagStream: { observe(): Observable<FlagStreamMessage> };
}

const KeyParam = z.object({ key: z.string() });

const ToggleFeatureFlagSchema = z
  .object({
    enabled: z.boolean().optional(),
    enabledForRoles: z.array(z.string()).optional(),
  })
  .strict();

const ActiveFlagsResponseSchema = z.object({
  flags: z.record(z.boolean()),
});

export const featureFlagsRoutes: ReadonlyArray<Route<FeatureFlagsUseCases>> = [
  {
    method: 'GET',
    path: '/v1/feature-flags/active',
    auth: { kind: 'jwt' },
    response: ActiveFlagsResponseSchema,
    openapi: {
      summary: 'Active flags for the current user',
      tags: ['feature-flags'],
      description:
        'Returns `{flags: Record<string, boolean>}`. A flag is `true` only if its own enabled state, every ancestor, and the role restriction all allow it. Frontend uses `flags[key]` directly without per-key resolution.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const flags = await bc.featureFlagService.snapshotFor(ctx.user!.userId);
      return { flags };
    },
  },
  // Legacy alias retained while clients migrate.
  {
    method: 'GET',
    path: '/v1/feature-flags/evaluate',
    auth: { kind: 'jwt' },
    openapi: {
      summary: '[Deprecated] Use /v1/feature-flags/active',
      tags: ['feature-flags'],
      description: 'Same payload as /v1/feature-flags/active. Kept for transition.',
    },
    sdk: { exported: false },
    handler: async (ctx, bc) => {
      const flags = await bc.featureFlagService.snapshotFor(ctx.user!.userId);
      return { flags };
    },
  },

  {
    method: 'GET',
    path: '/v1/admin/feature-flags',
    auth: { kind: 'jwt' },
    permission: Permission.FEATURE_FLAG_READ,
    openapi: {
      summary: 'List all feature flags with metadata and blocking info',
      tags: ['admin-feature-flags'],
      description: 'Admin Feature Flags API',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      const rows = await bc.listFlags.execute();
      return { flags: rows };
    },
  },
  {
    method: 'GET',
    path: '/v1/admin/feature-flags/:key/impact',
    auth: { kind: 'jwt' },
    permission: Permission.FEATURE_FLAG_READ,
    params: KeyParam,
    openapi: {
      summary: 'Preview transitive descendants affected when a flag is turned OFF',
      tags: ['admin-feature-flags'],
      description: 'Admin Feature Flags API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { key } = ctx.params as { key: string };
      return { tree: await bc.impactAnalysis.execute(key) };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/admin/feature-flags/:key',
    auth: { kind: 'jwt' },
    permission: Permission.FEATURE_FLAG_MANAGE,
    params: KeyParam,
    body: ToggleFeatureFlagSchema,
    openapi: {
      summary: 'Toggle a flag or update its role restriction',
      tags: ['admin-feature-flags'],
      description:
        'Turning ON is rejected with 409 when any ancestor is OFF. Deprecated flags are read-only.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { key } = ctx.params as { key: string };
      const body = ctx.body as z.infer<typeof ToggleFeatureFlagSchema>;
      const record = await bc.toggleFlag.execute({
        key,
        enabled: body.enabled,
        enabledForRoles: body.enabledForRoles,
        actorId: ctx.user!.userId,
      });
      return { ...record, blockedBy: [], effectiveGlobal: record.enabled };
    },
  },
  {
    method: 'POST',
    path: '/v1/admin/feature-flags/broadcast-refresh',
    auth: { kind: 'jwt' },
    permission: Permission.FEATURE_FLAG_MANAGE,
    openapi: {
      summary: 'Invalidate all client flag snapshots',
      tags: ['admin-feature-flags'],
      description:
        'Clears server-side caches and pushes an `invalidate` message through the SSE stream so every connected client refetches.',
    },
    sdk: { exported: true },
    handler: async (_ctx, bc) => {
      await bc.broadcastRefresh.execute();
      return undefined;
    },
  },
];

/**
 * SSE routes for the feature-flags BC. Live in a separate group because
 * the `Route<TBundle>` shape pins the bundle type per group — the SSE
 * subscriber consumes `FeatureFlagsSseBundle`, not `FeatureFlagsUseCases`.
 */
export const featureFlagsSseRoutes: ReadonlyArray<Route<FeatureFlagsSseBundle>> = [
  {
    method: 'GET',
    path: '/v1/feature-flags/stream',
    auth: { kind: 'jwt' },
    kind: 'sse',
    skip: ['responseWrapper'],
    openapi: {
      summary: 'Subscribe to flag invalidation broadcasts',
      tags: ['feature-flags'],
      description:
        'Server-Sent Events channel emitting `invalidate` messages when admin toggles a flag or triggers a broadcast refresh. Clients should re-fetch /evaluate on each message.',
    },
    sdk: { exported: false },
    handler: async (_ctx, bundle) => bundle.flagStream.observe(),
  },
];
