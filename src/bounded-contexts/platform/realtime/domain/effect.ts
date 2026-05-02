/**
 * Backend-driven UI effect descriptors. Each `Effect` describes a
 * single side-effect the frontend dispatcher should perform when the
 * SSE batch arrives — invalidating a query, showing a toast, navigating,
 * etc. The frontend has zero domain logic: it owns the dispatcher
 * (one switch on `kind`), and the backend decides what changes.
 *
 * The discriminated union here is the wire contract: every effect
 * sent across the SSE hub validates against `EffectSchema` so the
 * frontend can trust the shape and so we get an OpenAPI-friendly schema
 * (no `z.lazy()` — the swagger generator can't serialise it).
 */
import { z } from 'zod';
import { JsonValueSchema } from '@/shared-kernel/schemas/common/json.schema';

const QueryKey = z.array(z.union([z.string(), z.number()]));

const InvalidateQuery = z.object({
  kind: z.literal('invalidate-query'),
  queryKey: QueryKey,
});
const SetQueryData = z.object({
  kind: z.literal('set-query-data'),
  queryKey: QueryKey,
  data: JsonValueSchema,
});
const RemoveQuery = z.object({
  kind: z.literal('remove-query'),
  queryKey: QueryKey,
});
const OptimisticUpdate = z.object({
  kind: z.literal('optimistic-update'),
  queryKey: QueryKey,
  patch: z.array(JsonValueSchema),
});
const SetStore = z.object({
  kind: z.literal('set-store'),
  store: z.enum(['unreadCount', 'lockout', 'featureFlags', 'presence']),
  payload: JsonValueSchema,
});
const Toast = z.object({
  kind: z.literal('toast'),
  message: z.string(),
  severity: z.enum(['toast', 'modal', 'banner', 'inline', 'silent']),
  durationMs: z.number().int().optional(),
});
const Banner = z.object({
  kind: z.literal('banner'),
  message: z.string(),
  severity: z.enum(['toast', 'modal', 'banner', 'inline', 'silent']),
});
const Modal = z.object({
  kind: z.literal('modal'),
  component: z.literal('lockout'),
  payload: JsonValueSchema,
});
const Navigate = z.object({
  kind: z.literal('navigate'),
  to: z.string().regex(/^\//),
});
const Reload = z.object({ kind: z.literal('reload') });
const Prefetch = z.object({
  kind: z.literal('prefetch'),
  queryKey: QueryKey,
});
const RevokePermission = z.object({
  kind: z.literal('revoke-permission'),
  permission: z.string(),
});

export const EffectSchema = z.discriminatedUnion('kind', [
  InvalidateQuery,
  SetQueryData,
  RemoveQuery,
  OptimisticUpdate,
  SetStore,
  Toast,
  Banner,
  Modal,
  Navigate,
  Reload,
  Prefetch,
  RevokePermission,
]);
export type Effect = z.infer<typeof EffectSchema>;
