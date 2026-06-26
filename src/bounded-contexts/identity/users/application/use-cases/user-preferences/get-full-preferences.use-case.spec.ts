/**
 * Unit tests for GetFullPreferencesUseCase
 *
 * Uses In-Memory repository for clean, behavior-focused testing.
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryUserPreferencesRepository } from '../../../../shared-kernel/testing';
import { GetFullPreferencesUseCase } from './get-full-preferences.use-case';

describe('GetFullPreferencesUseCase', () => {
  let useCase: GetFullPreferencesUseCase;
  let repository: InMemoryUserPreferencesRepository;

  beforeEach(() => {
    repository = new InMemoryUserPreferencesRepository();
    useCase = new GetFullPreferencesUseCase(repository);
  });

  it('should materialise default preferences when none exist', async () => {
    const result = await useCase.execute('user-123');

    // The GET response must always satisfy the full-preferences schema, so a
    // missing row is lazily created from the upsert defaults rather than
    // returning an empty object (which left the client privacy tab spinning).
    expect(result.userId).toBe('user-123');
    expect(result.profileVisibility).toBe('PRIVATE');
    expect(result.messagePrivacy).toBe('EVERYONE');
    expect(repository.getFullPreferences('user-123')).toBeDefined();
  });

  it('should return full preferences when they exist', async () => {
    repository.seedFullPreferences('user-123', {
      theme: 'dark',
      language: 'en',
      emailNotifications: true,
      digestFrequency: 'WEEKLY',
    });

    const result = await useCase.execute('user-123');

    expect(result.theme).toBe('dark');
    expect(result.language).toBe('en');
  });
});
