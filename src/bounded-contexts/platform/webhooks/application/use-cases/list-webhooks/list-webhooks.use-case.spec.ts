import { describe, expect, it } from 'bun:test';
import { InMemoryWebhookConfigRepository } from '../../../testing';
import { ListWebhooksUseCase } from './list-webhooks.use-case';

describe('ListWebhooksUseCase', () => {
  it('returns only the requested user webhooks', async () => {
    const repo = new InMemoryWebhookConfigRepository();
    repo.seedConfig({ userId: 'u-1', events: ['resume.created'] });
    repo.seedConfig({ userId: 'u-1', events: ['resume.published'] });
    repo.seedConfig({ userId: 'u-2', events: ['resume.created'] });

    const result = await new ListWebhooksUseCase(repo).execute('u-1');
    expect(result).toHaveLength(2);
  });
});
