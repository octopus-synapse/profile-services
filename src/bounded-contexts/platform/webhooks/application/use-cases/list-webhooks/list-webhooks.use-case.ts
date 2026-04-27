import type { WebhookView } from '../../../domain/entities/webhook';
import { WebhookConfigRepositoryPort } from '../../../domain/ports/webhook-config.repository.port';

export class ListWebhooksUseCase {
  constructor(private readonly repository: WebhookConfigRepositoryPort) {}

  execute(userId: string): Promise<WebhookView[]> {
    return this.repository.listForUser(userId);
  }
}
