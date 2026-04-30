import type { WebhookDeliveryView } from '../../../domain/entities/webhook';
import { WebhookConfigRepositoryPort } from '../../../domain/ports/webhook-config.repository.port';
import { WebhookNotFoundException } from '../../../webhook.exceptions';

export class ListWebhookDeliveriesUseCase {
  constructor(private readonly repository: WebhookConfigRepositoryPort) {}

  async execute(userId: string, webhookId: string): Promise<WebhookDeliveryView[]> {
    const deliveries = await this.repository.listDeliveries(userId, webhookId);
    if (!deliveries) throw new WebhookNotFoundException(webhookId);
    return deliveries;
  }
}
