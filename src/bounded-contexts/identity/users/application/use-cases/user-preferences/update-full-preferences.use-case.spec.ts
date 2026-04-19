import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import type { UserPreferencesRepositoryPort } from '../../ports/user-preferences.port';
import { UpdateFullPreferencesUseCase } from './update-full-preferences.use-case';

describe('UpdateFullPreferencesUseCase', () => {
  let useCase: UpdateFullPreferencesUseCase;
  let repository: UserPreferencesRepositoryPort;

  const mockFullPreferences = {
    id: 'pref-1',
    userId: 'user-1',
    theme: 'dark',
    palette: 'ocean',
    bannerColor: null,
    language: 'pt-BR',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'UTC',
    emailNotifications: true,
    resumeExpiryAlerts: true,
    weeklyDigest: false,
    marketingEmails: false,
    emailMilestones: true,
    emailShareExpiring: true,
    digestFrequency: 'WEEKLY',
    profileVisibility: 'private',
    showEmail: false,
    showPhone: false,
    allowSearchEngineIndex: false,
    defaultExportFormat: 'pdf',
    includePhotoInExport: true,
    applyMode: 'ONE_CLICK' as const,
    applyCriteria: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  };

  beforeEach(() => {
    repository = {
      userExists: mock(async () => true),
      findPreferences: mock(async () => null),
      updatePreferences: mock(async () => undefined),
      findFullPreferences: mock(async () => null),
      upsertFullPreferences: mock(async () => mockFullPreferences),
    } as UserPreferencesRepositoryPort;

    useCase = new UpdateFullPreferencesUseCase(repository);
  });

  it('updates full preferences and returns domain entity (not envelope)', async () => {
    const result = await useCase.execute('user-1', {
      theme: 'dark',
      language: 'pt-BR',
    });

    expect(repository.userExists).toHaveBeenCalledWith('user-1');
    expect(repository.upsertFullPreferences).toHaveBeenCalledWith('user-1', {
      theme: 'dark',
      language: 'pt-BR',
    });

    expect(result).toEqual(mockFullPreferences);

    // CRITICAL: No envelope fields
    expect(result).not.toHaveProperty('success');
  });

  it('throws EntityNotFoundException when user does not exist', async () => {
    repository.userExists = mock(async () => false);

    await expect(useCase.execute('non-existent', { theme: 'dark' })).rejects.toThrow(
      EntityNotFoundException,
    );
  });
});
