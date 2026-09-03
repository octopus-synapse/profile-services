import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { AuditLogPort } from '@/shared-kernel/audit';
import { EntityNotFoundException, ValidationException } from '@/shared-kernel/exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { UserPreferencesRepositoryPort } from '../../ports/user-preferences.port';
import { UpdateFullPreferencesUseCase } from './update-full-preferences.use-case';

const stubAuditLog = (): AuditLogPort => ({ log: mock(async () => undefined) }) as AuditLogPort;

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
    marketingEmails: false,
    emailMilestones: true,
    emailShareExpiring: true,
    digestFrequency: 'WEEKLY',
    profileVisibility: 'PRIVATE' as const,
    messagePrivacy: 'EVERYONE' as const,
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
      findOneClickApplyConfig: mock(async () => null),
      upsertOneClickApplyConfig: mock(async (_u: string, c: unknown) => c),
      findFullPreferences: mock(async () => null),
      upsertFullPreferences: mock(async () => mockFullPreferences),
    } as UserPreferencesRepositoryPort;

    useCase = new UpdateFullPreferencesUseCase(repository, stubAuditLog(), stubLogger);
  });

  it('updates full preferences and returns domain entity (not envelope)', async () => {
    const result = await useCase.execute('user-1', { theme: 'dark', language: 'pt-BR' });

    expect(repository.userExists).toHaveBeenCalledWith('user-1');
    expect(repository.upsertFullPreferences).toHaveBeenCalledWith('user-1', {
      theme: 'dark',
      language: 'pt-BR',
    });

    expect(result).toEqual(mockFullPreferences);

    // CRITICAL: No envelope fields
    expect(result).not.toHaveProperty('success');
  });

  it('canonicalises the UI language before writing (pt_BR → pt-BR, en-US → en)', async () => {
    await useCase.execute('user-1', { language: 'pt_BR' });
    expect(repository.upsertFullPreferences).toHaveBeenLastCalledWith('user-1', {
      language: 'pt-BR',
    });

    await useCase.execute('user-1', { language: 'en-US' });
    expect(repository.upsertFullPreferences).toHaveBeenLastCalledWith('user-1', {
      language: 'en',
    });
  });

  it('rejects a language no served locale matches', async () => {
    await expect(useCase.execute('user-1', { language: 'fr' })).rejects.toThrow(
      ValidationException,
    );
    expect(repository.upsertFullPreferences).not.toHaveBeenCalled();
  });

  it('throws EntityNotFoundException when user does not exist', async () => {
    repository.userExists = mock(async () => false);

    await expect(useCase.execute('non-existent', { theme: 'dark' })).rejects.toThrow(
      EntityNotFoundException,
    );
  });
});
