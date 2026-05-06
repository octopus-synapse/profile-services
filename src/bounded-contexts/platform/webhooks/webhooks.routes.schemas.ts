/**
 * Route descriptors for the webhooks BC. Replaces `WebhookController`.
 */

import { z } from 'zod';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const SUPPORTED_EVENTS = [
  'resume.created',
  'resume.published',
  'ats.score.updated',
] as const;

export const IdParam = IdParamSchema;

export const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(SUPPORTED_EVENTS)).min(1),
});

export const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(SUPPORTED_EVENTS)).min(1).optional(),
  enabled: z.boolean().optional(),
});

// ─── Response schemas ────────────────────────────────────────────────
export const WebhookViewSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.enum(SUPPORTED_EVENTS)),
  enabled: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema.optional(),
});

export const WebhookDeliveryViewSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  attempt: z.number().int(),
  success: z.boolean(),
  statusCode: z.number().int().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});

export const ListWebhooksResponseSchema = z.object({
  webhooks: z.array(WebhookViewSchema),
});

export const CreateWebhookResponseSchema = z.object({
  webhook: WebhookViewSchema,
  secret: z.string(),
});

export const UpdateWebhookResponseSchema = z.object({
  webhook: WebhookViewSchema,
});

export const DeleteWebhookResponseSchema = z.object({}).strict();

export const ListDeliveriesResponseSchema = z.object({
  deliveries: z.array(WebhookDeliveryViewSchema),
});
