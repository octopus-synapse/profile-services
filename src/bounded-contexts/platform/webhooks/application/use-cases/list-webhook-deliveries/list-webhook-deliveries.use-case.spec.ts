import { describe, expect, it } from 'bun:test';
import { InMemoryWebhookConfigRepository } from '../../../testing';
import { WebhookNotFoundException } from '../../../webhook.exceptions';
import { ListWebhookDeliveriesUseCase } from './list-webhook-deliveries.use-case';

describe('ListWebhookDeliveriesUseCase', () => {
  it('returns the recorded deliveries for an owned webhook', async () => {
    const repo = new InMemoryWebhookConfigRepository();
    const wh = repo.seedConfig({ userId: 'u-1', events: ['resume.created'] });
    await repo.recordDelivery(
      wh.id,
      'resume.created',
      { ok: true },
      {
        attempt: 1,
        success: true,
        statusCode: 200,
        errorMessage: null,
      },
    );

    const deliveries = await new ListWebhookDeliveriesUseCase(repo).execute('u-1', wh.id);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]?.success).toBe(true);
  });

  it('throws WebhookNotFoundException for cross-user reads', async () => {
    const repo = new InMemoryWebhookConfigRepository();
    const wh = repo.seedConfig({ userId: 'u-2', events: ['resume.created'] });

    await expect(
      new ListWebhookDeliveriesUseCase(repo).execute('u-1', wh.id),
    ).rejects.toBeInstanceOf(WebhookNotFoundException);
  });
});
