/**
 * Pure-TS wiring for the webhooks BC. Zero `@nestjs/*` imports.
 *
 * Five POJO use cases drive the controller and one fan-out use case
 * (`deliverEventWebhooks`) drives the event handler. Persistence goes
 * through `WebhookConfigRepositoryPort` (Prisma adapter); HTTP
 * delivery goes through `WebhookDeliveryPort` (fetch + HMAC).
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { WebhooksUseCases } from './application/ports/webhooks.port';
import { CreateWebhookUseCase } from './application/use-cases/create-webhook/create-webhook.use-case';
import { DeleteWebhookUseCase } from './application/use-cases/delete-webhook/delete-webhook.use-case';
import { DeliverEventWebhooksUseCase } from './application/use-cases/deliver-event-webhooks/deliver-event-webhooks.use-case';
import { ListWebhookDeliveriesUseCase } from './application/use-cases/list-webhook-deliveries/list-webhook-deliveries.use-case';
import { ListWebhooksUseCase } from './application/use-cases/list-webhooks/list-webhooks.use-case';
import { UpdateWebhookUseCase } from './application/use-cases/update-webhook/update-webhook.use-case';
import { HttpWebhookDeliveryAdapter } from './infrastructure/adapters/external-services/http-webhook-delivery.adapter';
import { PrismaWebhookConfigRepository } from './infrastructure/adapters/persistence/prisma-webhook-config.repository';

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
