import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { UpdatePreferencesUseCase } from './update-preferences.use-case';
import type { UserPreferencesRepositoryPort } from '../ports/user-preferences.port';

describe('UpdatePreferencesUseCase', () => {
  let useCase: UpdatePreferencesUseCase;
  let repository: UserPreferencesRepositoryPort;

  beforeEach(() => {
    repository = {
      userExists: mock(async () => true),
      findPreferences: mock(async () => ({ theme: 'light', language: 'en' })),
      updatePreferences: mock(async () => undefined),
      findFullPreferences: mock(async () => null),
      upsertFullPreferences: mock(async () => ({
        id: 'pref-1',
        userId: 'user-1',
        theme: 'dark',
        palette: 'ocean',
        bannerColor: null,
        language: 'en',
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
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    } as UserPreferencesRepositoryPort;

    useCase = new UpdatePreferencesUseCase(repository);
  });

  it('updates preferences and returns void (not envelope)', async () => {
    const result = await useCase.execute('user-1', { palette: 'ocean' });

    expect(repository.userExists).toHaveBeenCalledWith('user-1');
    expect(repository.updatePreferences).toHaveBeenCalledWith('user-1', {
      palette: 'ocean',
    });

    // CRITICAL: Returns void, not envelope
    expect(result).toBeUndefined();
  });

  it('throws EntityNotFoundException when user does not exist', async () => {
    repository.userExists = mock(async () => false);

    await expect(
      useCase.execute('non-existent', { palette: 'ocean' }),
    ).rejects.toThrow(EntityNotFoundException);
  });
});
