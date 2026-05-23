/**
 * Route descriptors for the ui-state BC. Replaces `UiStateController`.
 */

import { z } from 'zod';
import { JsonValueSchema } from '@/shared-kernel/schemas/common/json.schema';

export const KeyParam = z.object({ key: z.string() });
export const SetKeyBody = z.object({ value: z.unknown() }).openapi({
  example: {
    value: { sidebarCollapsed: true, theme: 'dark' },
  },
});

export const UiStateGetAllResponseSchema = z.object({
  state: z.record(z.string(), JsonValueSchema),
});

export const UiStateSetKeyResponseSchema = z.object({
  key: z.string(),
  value: JsonValueSchema,
});

export const UiStateDeleteResponseSchema = z.object({ deleted: z.literal(true) });
