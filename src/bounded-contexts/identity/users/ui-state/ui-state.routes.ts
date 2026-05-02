/**
 * Route descriptors for the ui-state BC. Replaces `UiStateController`.
 */

import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import { UiStateService } from './ui-state.service';

const KeyParam = z.object({ key: z.string() });
const SetKeyBody = z.object({ value: z.unknown() });

// ─── Response schemas ────────────────────────────────────────────────
// JsonValue covers any value the user can persist (Prisma `Json` column).
// Recursive lazy schema avoids `z.unknown()`/`z.any()` at every leaf.
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

const UiStateGetAllResponseSchema = z.object({
  state: z.record(z.string(), JsonValueSchema),
});

const UiStateSetKeyResponseSchema = z.object({
  key: z.string(),
  value: JsonValueSchema,
});

const UiStateDeleteResponseSchema = z.object({ deleted: z.literal(true) });

export const uiStateRoutes: ReadonlyArray<Route<UiStateService>> = [
  {
    method: 'GET',
    path: '/v1/me/ui-state',
    auth: { kind: 'jwt' },
    response: UiStateGetAllResponseSchema,
    openapi: {
      summary:
        'Returns every UI-state row for the current user. UI bootstraps once and reads keys locally.',
      tags: ['users'],
      description: 'Per-user UI state',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const state = await bundle.getAll(ctx.user!.userId);
      return { state };
    },
  },
  {
    method: 'PATCH',
    path: '/v1/me/ui-state/:key',
    auth: { kind: 'jwt' },
    params: KeyParam,
    body: SetKeyBody,
    response: UiStateSetKeyResponseSchema,
    openapi: {
      summary: 'Upsert a single UI-state key/value (idempotent).',
      tags: ['users'],
      description: 'Per-user UI state',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { key } = ctx.params as { key: string };
      const body = ctx.body as { value: unknown };
      return bundle.setKey(ctx.user!.userId, key, body?.value);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/me/ui-state/:key',
    auth: { kind: 'jwt' },
    params: KeyParam,
    response: UiStateDeleteResponseSchema,
    openapi: {
      summary: 'Remove a UI-state key.',
      tags: ['users'],
      description: 'Per-user UI state',
    },
    sdk: { exported: true },
    handler: async (ctx, bundle) => {
      const { key } = ctx.params as { key: string };
      await bundle.deleteKey(ctx.user!.userId, key);
      return { deleted: true };
    },
  },
];
