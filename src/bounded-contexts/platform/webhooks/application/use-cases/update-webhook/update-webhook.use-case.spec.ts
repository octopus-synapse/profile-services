import { describe, expect, it } from 'bun:test';
import { InMemoryWebhookConfigRepository } from '../../../testing';
import { WebhookNotFoundException } from '../../../webhook.exceptions';
import { UpdateWebhookUseCase } from './update-webhook.use-case';

describe('UpdateWebhookUseCase', () => {
  it('updates an owned webhook', async () => {
    const repo = new InMemoryWebhookConfigRepository();
    const seeded = repo.seedConfig({ userId: 'u-1', events: ['resume.created'] });

    const updated = await new UpdateWebhookUseCase(repo).execute('u-1', seeded.id, {
      enabled: false,
    });

    expect(updated.enabled).toBe(false);
  });

  it('throws WebhookNotFoundException for cross-user updates', async () => {
    const repo = new InMemoryWebhookConfigRepository();
    const seeded = repo.seedConfig({ userId: 'u-2', events: ['resume.created'] });

    await expect(
      new UpdateWebhookUseCase(repo).execute('u-1', seeded.id, { enabled: false }),
    ).rejects.toBeInstanceOf(WebhookNotFoundException);
  });
});
