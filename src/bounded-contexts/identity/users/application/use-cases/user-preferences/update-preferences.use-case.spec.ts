import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { AuditLogPort } from '@/shared-kernel/audit';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { UserPreferencesRepositoryPort } from '../../ports/user-preferences.port';
import { UpdatePreferencesUseCase } from './update-preferences.use-case';

const stubAuditLog = (): AuditLogPort => ({ log: mock(async () => undefined) }) as AuditLogPort;

describe('UpdatePreferencesUseCase', () => {
  let useCase: UpdatePreferencesUseCase;
  let repository: UserPreferencesRepositoryPort;

  beforeEach(() => {
    repository = {
      userExists: mock(async () => true),
      findPreferences: mock(async () => ({ theme: 'light', language: 'en' })),
      updatePreferences: mock(async () => undefined),
      findOneClickApplyConfig: mock(async () => null),
      upsertOneClickApplyConfig: mock(async (_u: string, c: unknown) => c),
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
        profileVisibility: 'PRIVATE',
        messagePrivacy: 'EVERYONE',
        showEmail: false,
        showPhone: false,
        allowSearchEngineIndex: false,
        defaultExportFormat: 'pdf',
        includePhotoInExport: true,
        applyMode: 'ONE_CLICK' as const,
        applyCriteria: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    } as UserPreferencesRepositoryPort;

    useCase = new UpdatePreferencesUseCase(repository, stubAuditLog(), stubLogger);
  });

  it('updates preferences and returns void (not envelope)', async () => {
    const result = await useCase.execute('user-1', { palette: 'ocean' });

    expect(repository.userExists).toHaveBeenCalledWith('user-1');
    expect(repository.updatePreferences).toHaveBeenCalledWith('user-1', { palette: 'ocean' });

    // CRITICAL: Returns void, not envelope
    expect(result).toBeUndefined();
  });

  it('throws EntityNotFoundException when user does not exist', async () => {
    repository.userExists = mock(async () => false);

    await expect(useCase.execute('non-existent', { palette: 'ocean' })).rejects.toThrow(
      EntityNotFoundException,
    );
  });
});
