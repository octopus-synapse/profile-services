/**
 * Route descriptors for the automation BC. Replaces the `current` and
 * `reject` endpoints of `ApplyModeController`. The `approve` endpoint
 * stays as a legacy controller because it uses custom guards
 * (`RequireFitProfileGuard`, `RequireMinQualityGuard`); ditto the whole
 * `RageApplyController` for the same reason.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { AutomationUseCases } from './application/ports/automation.port';

const ItemIdParam = z.object({ itemId: z.string() });

export const automationRoutes: ReadonlyArray<Route<AutomationUseCases>> = [
  {
    method: 'GET',
    path: '/v1/apply-mode/weekly-curated/current',
    auth: { kind: 'jwt' },
    openapi: {
      summary: "This week's curated batch for the viewer.",
      tags: ['apply-mode'],
      description: 'Weekly curated approval flow',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const batch = await bc.getCurrentBatch.execute(ctx.user!.userId);
      return { success: true, data: { batch } };
    },
  },
  {
    method: 'POST',
    path: '/v1/apply-mode/weekly-curated/:itemId/reject',
    auth: { kind: 'jwt' },
    params: ItemIdParam,
    openapi: {
      summary: 'Reject a curated item.',
      tags: ['apply-mode'],
      description: 'Weekly curated approval flow',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { itemId } = ctx.params as { itemId: string };
      await bc.rejectCuratedItem.execute(ctx.user!.userId, itemId);
      return { success: true, data: { itemId } };
    },
  },
];
