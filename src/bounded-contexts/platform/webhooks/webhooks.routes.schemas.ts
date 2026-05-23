/**
 * Route descriptors for the webhooks BC. Replaces `WebhookController`.
 */

import { z } from 'zod';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import { SocialUrlSchema } from '@/shared-kernel/schemas/primitives';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const SUPPORTED_EVENTS = [
  'resume.created',
  'resume.published',
  'ats.score.updated',
] as const;

export const IdParam = IdParamSchema;

export const CreateWebhookSchema = z
  .object({
    url: SocialUrlSchema,
    events: z
      .array(z.enum(SUPPORTED_EVENTS))
      .min(1)
      .openapi({ description: 'Event types this webhook subscribes to. At least one required.' }),
  })
  .openapi('CreateWebhookRequest', {
    description:
      'Register an outbound webhook. URL is fetched through the SafeFetchPort allowlist on delivery (SSRF defense).',
    example: {
      url: 'https://hooks.example.com/patch-careers/webhook',
      events: ['resume.created', 'resume.published'],
    },
  });

export const UpdateWebhookSchema = z
  .object({
    url: SocialUrlSchema.optional(),
    events: z
      .array(z.enum(SUPPORTED_EVENTS))
      .min(1)
      .optional()
      .openapi({ description: 'Updated event subscriptions. Omit to leave unchanged.' }),
    enabled: z
      .boolean()
      .optional()
      .openapi({ description: 'Whether the webhook is currently active.' }),
  })
  .openapi('UpdateWebhookRequest', {
    description:
      'Partial update of a webhook (rotate URL, change event subscriptions, toggle enabled).',
    example: {
      events: ['ats.score.updated'],
      enabled: false,
    },
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
