/**
 * Route descriptors for the webhooks BC. Replaces `WebhookController`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { WebhooksUseCases } from './application/ports/webhooks.port';

const SUPPORTED_EVENTS = ['resume.created', 'resume.published', 'ats.score.updated'] as const;

const IdParam = z.object({ id: z.string() });

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(SUPPORTED_EVENTS)).min(1),
});

const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(SUPPORTED_EVENTS)).min(1).optional(),
  enabled: z.boolean().optional(),
});

export const webhooksRoutes: ReadonlyArray<Route<WebhooksUseCases>> = [
  {
    method: 'GET',
    path: '/v1/webhooks',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    openapi: {
      summary: 'List webhooks registered by the current user.',
      tags: ['webhooks'],
      description: 'User-registered webhook subscriptions.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const webhooks = await bc.listWebhooks.execute(ctx.user!.userId);
      return { webhooks };
    },
  },
  {
    method: 'POST',
    path: '/v1/webhooks',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    body: CreateWebhookSchema,
    openapi: {
      summary: 'Register a new webhook subscription.',
      tags: ['webhooks'],
      description: 'User-registered webhook subscriptions.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as z.infer<typeof CreateWebhookSchema>;
      const result = await bc.createWebhook.execute(ctx.user!.userId, body);
      return result;
    },
  },
  {
    method: 'PATCH',
    path: '/v1/webhooks/:id',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: IdParam,
    body: UpdateWebhookSchema,
    openapi: {
      summary: 'Update a webhook subscription.',
      tags: ['webhooks'],
      description: 'User-registered webhook subscriptions.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const body = ctx.body as z.infer<typeof UpdateWebhookSchema>;
      const webhook = await bc.updateWebhook.execute(ctx.user!.userId, id, body);
      return { webhook };
    },
  },
  {
    method: 'DELETE',
    path: '/v1/webhooks/:id',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_UPDATE,
    params: IdParam,
    openapi: {
      summary: 'Delete a webhook subscription.',
      tags: ['webhooks'],
      description: 'User-registered webhook subscriptions.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      await bc.deleteWebhook.execute(ctx.user!.userId, id);
      return undefined;
    },
  },
  {
    method: 'GET',
    path: '/v1/webhooks/:id/deliveries',
    auth: { kind: 'jwt' },
    permission: Permission.RESUME_READ,
    params: IdParam,
    openapi: {
      summary: 'List recent delivery attempts for a webhook.',
      tags: ['webhooks'],
      description: 'User-registered webhook subscriptions.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const deliveries = await bc.listWebhookDeliveries.execute(ctx.user!.userId, id);
      return { deliveries };
    },
  },
];
