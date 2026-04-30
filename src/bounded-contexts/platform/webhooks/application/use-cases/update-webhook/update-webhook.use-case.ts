import type { WebhookView } from '../../../domain/entities/webhook';
import {
  type UpdateWebhookInput,
  WebhookConfigRepositoryPort,
} from '../../../domain/ports/webhook-config.repository.port';
import { WebhookNotFoundException } from '../../../webhook.exceptions';

export class UpdateWebhookUseCase {
  constructor(private readonly repository: WebhookConfigRepositoryPort) {}

  async execute(userId: string, id: string, input: UpdateWebhookInput): Promise<WebhookView> {
    const webhook = await this.repository.updateForUser(userId, id, input);
    if (!webhook) throw new WebhookNotFoundException(id);
    return webhook;
  }
}
