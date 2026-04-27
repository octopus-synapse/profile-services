/**
 * Route descriptors for the feature-flags BC. Replaces
 * `AdminFeatureFlagsController` and the `evaluate` endpoint of
 * `FeatureFlagsController`. The `subscribe` SSE endpoint stays as a
 * legacy controller because the synthesizer does not yet model SSE.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { FeatureFlagsUseCases } from './application/ports/feature-flags.port';

const KeyParam = z.object({ key: z.string() });

const ToggleFeatureFlagSchema = z
  .object({
    enabled: z.boolean().optional(),
    enabledForRoles: z.array(z.string()).optional(),
  })
  .strict();

export const featureFlagsRoutes: ReadonlyArray<Route<FeatureFlagsUseCases>> = [
  {
    method: 'GET',
    path: '/v1/feature-flags/evaluate',
    auth: { kind: 'jwt' },
    openapi: {
      summary: 'Evaluate effective flag state for the current user',
      tags: ['feature-flags'],
      description:
        'Returns a map of flag key to boolean. The boolean is the effective value: a flag is true only if its own enabled state, every ancestor, and the role restriction all allow it.',
    },
    sdk: { exported: true },
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
      return { success: true };
    },
  },
];
