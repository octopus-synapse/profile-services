/**
 * Bundle token for the webhooks BC. Doubles as the TypeScript shape
 * of the use-case bag and the Nest DI token. Composition lives in
 * `webhooks.composition.ts` — Nest-free.
 */

import type { CreateWebhookUseCase } from '../use-cases/create-webhook/create-webhook.use-case';
import type { DeleteWebhookUseCase } from '../use-cases/delete-webhook/delete-webhook.use-case';
import type { DeliverEventWebhooksUseCase } from '../use-cases/deliver-event-webhooks/deliver-event-webhooks.use-case';
import type { ListWebhookDeliveriesUseCase } from '../use-cases/list-webhook-deliveries/list-webhook-deliveries.use-case';
import type { ListWebhooksUseCase } from '../use-cases/list-webhooks/list-webhooks.use-case';
import type { UpdateWebhookUseCase } from '../use-cases/update-webhook/update-webhook.use-case';

export abstract class WebhooksUseCases {
  abstract readonly listWebhooks: ListWebhooksUseCase;
  abstract readonly createWebhook: CreateWebhookUseCase;
  abstract readonly updateWebhook: UpdateWebhookUseCase;
  abstract readonly deleteWebhook: DeleteWebhookUseCase;
  abstract readonly listWebhookDeliveries: ListWebhookDeliveriesUseCase;
  abstract readonly deliverEventWebhooks: DeliverEventWebhooksUseCase;
}
