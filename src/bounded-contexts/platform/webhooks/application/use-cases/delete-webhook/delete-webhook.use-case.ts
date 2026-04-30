import { WebhookConfigRepositoryPort } from '../../../domain/ports/webhook-config.repository.port';
import { WebhookNotFoundException } from '../../../webhook.exceptions';

export class DeleteWebhookUseCase {
  constructor(private readonly repository: WebhookConfigRepositoryPort) {}

  async execute(userId: string, id: string): Promise<void> {
    const deleted = await this.repository.deleteForUser(userId, id);
    if (!deleted) throw new WebhookNotFoundException(id);
  }
}
