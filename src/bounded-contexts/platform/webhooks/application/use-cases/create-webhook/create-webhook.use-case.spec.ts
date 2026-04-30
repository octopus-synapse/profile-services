import { describe, expect, it } from 'bun:test';
import { InMemoryWebhookConfigRepository } from '../../../testing';
import { CreateWebhookUseCase } from './create-webhook.use-case';

describe('CreateWebhookUseCase', () => {
  it('persists the new webhook and returns the freshly generated secret', async () => {
    const repo = new InMemoryWebhookConfigRepository();

    const result = await new CreateWebhookUseCase(repo).execute('u-1', {
      url: 'https://example.com/hook',
      events: ['resume.created'],
    });

    expect(result.webhook.url).toBe('https://example.com/hook');
    // Secret is 32-byte hex (64 chars)
    expect(result.secret).toMatch(/^[a-f0-9]{64}$/);

    const all = [...repo.configs.values()];
    expect(all).toHaveLength(1);
    expect(all[0]?.secret).toBe(result.secret);
  });
});
