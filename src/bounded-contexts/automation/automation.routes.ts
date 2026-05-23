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

import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { AutomationUseCases } from './application/ports/automation.port';
import {
  ApproveCuratedItemResponseSchema,
  CurrentBatchResponseSchema,
  ItemIdParam,
  RageApplyBody,
  RageApplyBodySchema,
  RageApplyResponseSchema,
  RejectCuratedItemResponseSchema,
} from './automation.routes.schemas';

export const automationRoutes: ReadonlyArray<Route<AutomationUseCases>> = [
  {
    method: 'GET',
    path: '/v1/apply-mode/weekly-curated/current',
    auth: { kind: 'jwt' },
    response: CurrentBatchResponseSchema,
    openapi: {
      summary: "This week's curated batch for the viewer.",
      tags: ['apply-mode'],
      description: 'Weekly curated approval flow',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const batch = await bc.getCurrentBatch.execute(ctx.user!.userId);
      return { batch };
    },
  },
  {
    method: 'POST',
    path: '/v1/apply-mode/weekly-curated/:itemId/reject',
    auth: { kind: 'jwt' },
    params: ItemIdParam,
    response: RejectCuratedItemResponseSchema,
    openapi: {
      summary: 'Reject a curated item.',
      tags: ['apply-mode'],
      description: 'Weekly curated approval flow',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { itemId } = ctx.params as { itemId: string };
      await bc.rejectCuratedItem.execute(ctx.user!.userId, itemId);
      return { itemId };
    },
  },
  {
    method: 'POST',
    path: '/v1/apply-mode/weekly-curated/:itemId/approve',
    auth: { kind: 'jwt' },
    params: ItemIdParam,
    statusCode: 200,
    response: ApproveCuratedItemResponseSchema,
    guards: [{ id: 'fit-profile' }, { id: 'min-quality' }],
    openapi: {
      summary: "Approve a curated item — submits a JobApplication using the user's primary resume.",
      tags: ['apply-mode'],
      description: 'Weekly curated approval flow',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { itemId } = ctx.params as { itemId: string };
      const result = await bc.approveCuratedItem.execute(ctx.user!.userId, itemId);
      return result;
    },
  },
  {
    method: 'POST',
    path: '/v1/automation/rage-apply',
    auth: { kind: 'jwt' },
    permission: Permission.RAGE_APPLY,
    body: RageApplyBodySchema,
    statusCode: 200,
    response: RageApplyResponseSchema,
    guards: [{ id: 'fit-profile' }, { id: 'min-quality' }, { id: 'external-api' }],
    openapi: {
      summary:
        'Submit tailored applications to every open job that matches minFit. Bounded by maxApplications (default 20, cap 100).',
      tags: ['automation'],
      description: 'Batch apply API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as RageApplyBody;
      const since =
        typeof body.sinceDays === 'number'
          ? new Date(Date.now() - body.sinceDays * 24 * 60 * 60 * 1000)
          : undefined;
      const result = await bc.runRageApply.execute({
        userId: ctx.user!.userId,
        minFit: body.minFit,
        maxApplications: body.maxApplications,
        since,
      });
      return result;
    },
  },
];
