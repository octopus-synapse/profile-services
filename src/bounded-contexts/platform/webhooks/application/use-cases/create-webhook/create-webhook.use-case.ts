/**
 * Registers a new webhook subscription. Generates a 32-byte hex
 * secret here so the controller doesn't have to know the format,
 * persists it via the repository, and returns the secret one-time
 * to the caller (it's not returned by `list`).
 */

import { randomBytes } from 'node:crypto';
import type { WebhookView } from '../../../domain/entities/webhook';
import {
  type CreateWebhookInput,
  WebhookConfigRepositoryPort,
} from '../../../domain/ports/webhook-config.repository.port';

export class CreateWebhookUseCase {
  constructor(private readonly repository: WebhookConfigRepositoryPort) {}

  async execute(
    userId: string,
    input: CreateWebhookInput,
  ): Promise<{ webhook: WebhookView; secret: string }> {
    const secret = randomBytes(32).toString('hex');
    const webhook = await this.repository.createForUser(userId, input, secret);
    return { webhook, secret };
  }
}
