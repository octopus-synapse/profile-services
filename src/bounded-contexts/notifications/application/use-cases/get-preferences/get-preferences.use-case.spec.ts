import { describe, expect, it } from 'bun:test';
import { InMemoryNotificationsRepository } from '../../../testing';
import { GetPreferencesUseCase } from './get-preferences.use-case';

describe('GetPreferencesUseCase', () => {
  it('fills defaults for every supported type', async () => {
    const repo = new InMemoryNotificationsRepository();

    const all = await new GetPreferencesUseCase(repo).execute('u-1');

    expect(all.length).toBeGreaterThan(0);
    const liked = all.find((p) => p.type === 'POST_LIKED');
    expect(liked).toEqual({
      type: 'POST_LIKED',
      enabled: true,
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: false,
      emailDelivery: 'INSTANT',
    });
  });

  it('honours explicit overrides', async () => {
    const repo = new InMemoryNotificationsRepository();
    repo.setPreferenceRow('u-1', 'POST_LIKED', {
      enabled: false,
      inAppEnabled: false,
      emailEnabled: false,
      pushEnabled: false,
      emailDelivery: 'OFF',
    });

    const all = await new GetPreferencesUseCase(repo).execute('u-1');
    const liked = all.find((p) => p.type === 'POST_LIKED');
    expect(liked).toEqual({
      type: 'POST_LIKED',
      enabled: false,
      inAppEnabled: false,
      emailEnabled: false,
      pushEnabled: false,
      emailDelivery: 'OFF',
    });
  });
});
