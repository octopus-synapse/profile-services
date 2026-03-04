/**
 * Unit tests for GetPreferencesUseCase
 *
 * Uses In-Memory repository for clean, behavior-focused testing.
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { GetPreferencesUseCase } from './get-preferences.use-case';
import { InMemoryUserPreferencesRepository } from '../../../../shared-kernel/testing';

describe('GetPreferencesUseCase', () => {
  let useCase: GetPreferencesUseCase;
  let repository: InMemoryUserPreferencesRepository;

  beforeEach(() => {
    repository = new InMemoryUserPreferencesRepository();
    useCase = new GetPreferencesUseCase(repository as any);
  });

  it('should throw EntityNotFoundException when preferences not found', async () => {
    await expect(useCase.execute('user-123')).rejects.toThrow(
      EntityNotFoundException,
    );
  });

  it('should return preferences when they exist', async () => {
    repository.seedPreferences('user-123', {
      theme: 'dark',
      language: 'en',
      emailNotifications: true,
    });

    const result = await useCase.execute('user-123');

    expect(result.theme).toBe('dark');
    expect(result.language).toBe('en');
  });
});
