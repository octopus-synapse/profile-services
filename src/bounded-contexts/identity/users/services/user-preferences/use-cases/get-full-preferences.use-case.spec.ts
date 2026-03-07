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

  it('should return empty object when preferences not found', async () => {
    const result = await useCase.execute('user-123');

    expect(result).toEqual({});
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
