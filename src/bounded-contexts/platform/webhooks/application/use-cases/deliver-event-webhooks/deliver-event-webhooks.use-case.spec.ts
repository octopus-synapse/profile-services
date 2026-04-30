import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryWebhookConfigRepository, InMemoryWebhookDelivery } from '../../../testing';
import { DeliverEventWebhooksUseCase } from './deliver-event-webhooks.use-case';

describe('DeliverEventWebhooksUseCase', () => {
  let repo: InMemoryWebhookConfigRepository;
  let delivery: InMemoryWebhookDelivery;
  let useCase: DeliverEventWebhooksUseCase;

  beforeEach(() => {
    repo = new InMemoryWebhookConfigRepository();
    delivery = new InMemoryWebhookDelivery();
    useCase = new DeliverEventWebhooksUseCase(repo, delivery, stubLogger);
  });

  it('returns zeros when no webhooks are registered for the event', async () => {
    const summary = await useCase.execute({
      userId: 'u-1',
      eventType: 'resume.created',
      payload: {},
    });
    expect(summary).toEqual({ attempted: 0, succeeded: 0, failed: 0 });
    expect(delivery.calls).toHaveLength(0);
  });

  it('skips disabled webhooks and webhooks for other event types', async () => {
    repo.seedConfig({ userId: 'u-1', events: ['resume.published'] });
    repo.seedConfig({ userId: 'u-1', events: ['resume.created'], enabled: false });
    repo.seedConfig({ userId: 'u-1', events: ['resume.created'] });

    await useCase.execute({ userId: 'u-1', eventType: 'resume.created', payload: {} });

    expect(delivery.calls).toHaveLength(1);
  });

  it('records every delivery outcome and surfaces failure counts', async () => {
    repo.seedConfig({ userId: 'u-1', events: ['resume.created'], url: 'https://a' });
    repo.seedConfig({ userId: 'u-1', events: ['resume.created'], url: 'https://b' });

    delivery.setNextOutcome({ attempt: 3, success: false, statusCode: 500, errorMessage: 'boom' });

    const summary = await useCase.execute({
      userId: 'u-1',
      eventType: 'resume.created',
      payload: { resumeId: 'r-1' },
    });

    expect(summary.attempted).toBe(2);
    expect(summary.failed).toBe(2);
    expect(repo.deliveries).toHaveLength(2);
    expect(repo.deliveries[0]?.outcome.success).toBe(false);
  });
});
