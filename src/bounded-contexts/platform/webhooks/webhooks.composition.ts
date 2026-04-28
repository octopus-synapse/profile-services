/**
 * Pure-TS wiring for the webhooks BC. Zero `@nestjs/*` imports.
 *
 * Phase-1 canonical shape: returns
 * `{ useCases, routes, eventHandlers }` as a
 * `BoundedContextComposition`. Five POJO use cases drive the routes,
 * one fan-out use case (`deliverEventWebhooks`) drives the three
 * event handlers — published as raw payloads keyed by string event
 * names (`resume.created`, `resume.published`, `ats.score.updated`),
 * not `EventClass.TYPE` envelopes.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BcEventBinding, BoundedContextComposition } from '@/shared-kernel/composition';
import { WebhooksUseCases } from './application/ports/webhooks.port';
import { CreateWebhookUseCase } from './application/use-cases/create-webhook/create-webhook.use-case';
import { DeleteWebhookUseCase } from './application/use-cases/delete-webhook/delete-webhook.use-case';
import { DeliverEventWebhooksUseCase } from './application/use-cases/deliver-event-webhooks/deliver-event-webhooks.use-case';
import { ListWebhookDeliveriesUseCase } from './application/use-cases/list-webhook-deliveries/list-webhook-deliveries.use-case';
import { ListWebhooksUseCase } from './application/use-cases/list-webhooks/list-webhooks.use-case';
import { UpdateWebhookUseCase } from './application/use-cases/update-webhook/update-webhook.use-case';
import { HttpWebhookDeliveryAdapter } from './infrastructure/adapters/external-services/http-webhook-delivery.adapter';
import { PrismaWebhookConfigRepository } from './infrastructure/adapters/persistence/prisma-webhook-config.repository';
import { WebhookEventHandler } from './infrastructure/handlers/webhook-event.handler';
import { webhooksRoutes } from './webhooks.routes';

export { WebhooksUseCases };

export function buildWebhooksUseCases(prisma: PrismaService, logger: LoggerPort): WebhooksUseCases {
  // Repos / external adapters
  const configRepo = new PrismaWebhookConfigRepository(prisma, logger);
  const delivery = new HttpWebhookDeliveryAdapter(logger);

  return {
    listWebhooks: new ListWebhooksUseCase(configRepo),
    createWebhook: new CreateWebhookUseCase(configRepo),
    updateWebhook: new UpdateWebhookUseCase(configRepo),
    deleteWebhook: new DeleteWebhookUseCase(configRepo),
    listWebhookDeliveries: new ListWebhookDeliveriesUseCase(configRepo),
    deliverEventWebhooks: new DeliverEventWebhooksUseCase(configRepo, delivery, logger),
  };
}

export function buildWebhooksComposition(
  prisma: PrismaService,
  logger: LoggerPort,
): BoundedContextComposition<WebhooksUseCases> {
  const useCases = buildWebhooksUseCases(prisma, logger);

  // --- Event handlers (POJO `@OnEvent` replacements) ---
  // Note: these are payload-only events (no `EventClass.TYPE`); the
  // upstream emitters publish raw payload objects keyed by string
  // event names — so the handler signature stays `(payload) => ...`.
  const handler = new WebhookEventHandler(useCases, logger);

  const eventHandlers: ReadonlyArray<BcEventBinding> = [
    {
      eventType: 'resume.created',
      handler: handler.handleResumeCreated.bind(handler) as BcEventBinding['handler'],
    },
    {
      eventType: 'resume.published',
      handler: handler.handleResumePublished.bind(handler) as BcEventBinding['handler'],
    },
    {
      eventType: 'ats.score.updated',
      handler: handler.handleATSScoreUpdated.bind(handler) as BcEventBinding['handler'],
    },
  ];

  return {
    useCases,
    routes: webhooksRoutes,
    eventHandlers,
  };
}
