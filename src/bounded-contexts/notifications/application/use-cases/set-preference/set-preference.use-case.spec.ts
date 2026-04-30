import { describe, expect, it } from 'bun:test';
import { InMemoryNotificationsRepository } from '../../../testing';
import { SetPreferenceUseCase } from './set-preference.use-case';

describe('SetPreferenceUseCase', () => {
  it('inserts a new preference row with defaults applied', async () => {
    const repo = new InMemoryNotificationsRepository();
    const result = await new SetPreferenceUseCase(repo).execute('u-1', 'POST_LIKED', {
      enabled: false,
    });

    expect(result.enabled).toBe(false);
    expect(result.emailDelivery).toBe('INSTANT');
  });

  it('merges partial updates into existing rows', async () => {
    const repo = new InMemoryNotificationsRepository();
    const useCase = new SetPreferenceUseCase(repo);
    await useCase.execute('u-1', 'POST_LIKED', { enabled: false, emailDelivery: 'DAILY' });
    const result = await useCase.execute('u-1', 'POST_LIKED', { emailEnabled: false });

    expect(result.enabled).toBe(false);
    expect(result.emailEnabled).toBe(false);
    expect(result.emailDelivery).toBe('DAILY');
  });
});
