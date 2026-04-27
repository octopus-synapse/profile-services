import { describe, expect, it } from 'bun:test';
import { InMemoryWebhookConfigRepository } from '../../../testing';
import { WebhookNotFoundException } from '../../../webhook.exceptions';
import { DeleteWebhookUseCase } from './delete-webhook.use-case';

describe('DeleteWebhookUseCase', () => {
  it('deletes when the user owns the webhook', async () => {
    const repo = new InMemoryWebhookConfigRepository();
    const seeded = repo.seedConfig({ userId: 'u-1', events: ['resume.created'] });

    await new DeleteWebhookUseCase(repo).execute('u-1', seeded.id);
    expect(repo.configs.has(seeded.id)).toBe(false);
  });

  it('throws WebhookNotFoundException for cross-user deletes', async () => {
    const repo = new InMemoryWebhookConfigRepository();
    const seeded = repo.seedConfig({ userId: 'u-2', events: ['resume.created'] });

    await expect(
      new DeleteWebhookUseCase(repo).execute('u-1', seeded.id),
    ).rejects.toBeInstanceOf(WebhookNotFoundException);
    expect(repo.configs.has(seeded.id)).toBe(true);
  });
});
