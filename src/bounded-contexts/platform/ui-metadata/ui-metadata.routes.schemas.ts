/**
 * Schemas for the ui-metadata BC — the enum catalog only. The
 * server-driven menu, dashboard and settings payloads were removed
 * (ADR-005).
 */

import { z } from 'zod';

export const EnumKeyParams = z
  .object({ key: z.string() })
  .openapi({ example: { key: 'notification-types' } });

export const LocalizedLabelsSchema = z.object({
  'pt-BR': z.string(),
  en: z.string(),
});

export const EnumKeysResponseSchema = z.object({ keys: z.array(z.string()) });

export const EnumValueDescriptorSchema = z.object({
  value: z.string(),
  icon: z.string(),
  group: z.string().optional(),
  tone: z.enum(['neutral', 'info', 'success', 'warning', 'danger']).optional(),
  labels: LocalizedLabelsSchema,
});

export const EnumDescriptorResponseSchema = z.object({
  key: z.string(),
  values: z.array(EnumValueDescriptorSchema),
});

// Menu tree is bounded at two levels by `application/services/menu-builder.ts`
// (root nodes + a single layer of children). The schema mirrors that
// invariant explicitly instead of using `z.lazy`, which the swagger generator
// (`@asteasolutions/zod-to-openapi`) cannot serialise without an explicit
// `.openapi({ refId })` ceremony per recursive node.
