/**
 * Route descriptors for the ui-state BC. Replaces `UiStateController`.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { UiStateService } from './ui-state.service';

const KeyParam = z.object({ key: z.string() });
const SetKeyBody = z.object({ value: z.unknown() });

export const uiStateRoutes: ReadonlyArray<Route<UiStateService>> = [
  {
    method: 'GET',
    path: '/v1/me/ui-state',
    auth: { kind: 'jwt' },
    openapi: {
      summary:
        'Returns every UI-state row for the current user. UI bootstraps once and reads keys locally.',
      tags: ['users'],
      description: 'Per-user UI state',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const state = await bundle.getAll(ctx.user!.userId);
      return { success: true, data: { state } };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/me/ui-state/:key',
    auth: { kind: 'jwt' },
    params: KeyParam,
    body: SetKeyBody,
    openapi: {
      summary: 'Upsert a single UI-state key/value (idempotent).',
      tags: ['users'],
      description: 'Per-user UI state',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { key } = ctx.params as { key: string };
      const body = ctx.body as { value: unknown };
      const data = await bundle.setKey(ctx.user!.userId, key, body?.value);
      return { success: true, data };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/me/ui-state/:key',
    auth: { kind: 'jwt' },
    params: KeyParam,
    openapi: {
      summary: 'Remove a UI-state key.',
      tags: ['users'],
      description: 'Per-user UI state',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { key } = ctx.params as { key: string };
      await bundle.deleteKey(ctx.user!.userId, key);
      return { success: true, data: { deleted: true } };
    },
  },
];
