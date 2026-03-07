/**
 * User Preferences Service (Facade) Tests
 *
 * Tests the facade pattern, verifying delegation to use cases.
 * Uses bun:mock for clean test doubles.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type {
  FullUserPreferences,
  UserPreferences,
  UserPreferencesUseCases,
} from './user-preferences/ports/user-preferences.port';
import { UserPreferencesService } from './user-preferences.service';

describe('UserPreferencesService (Facade)', () => {
  let service: UserPreferencesService;
  let mockUseCases: UserPreferencesUseCases;

  const mockPreferences: UserPreferences = {
    theme: 'dark',
    language: 'en',
  };

  const mockFullPreferences: FullUserPreferences = {
    id: 'pref-1',
    userId: 'user-123',
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
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  };

  beforeEach(() => {
    mockUseCases = {
      getPreferencesUseCase: {
        execute: mock(async () => mockPreferences),
      },
      updatePreferencesUseCase: {
        execute: mock(async () => undefined),
      },
      getFullPreferencesUseCase: {
        execute: mock(async () => mockFullPreferences),
      },
      updateFullPreferencesUseCase: {
        execute: mock(async () => mockFullPreferences),
      },
    };

    // Create service with injected use cases
    service = new UserPreferencesService(mockUseCases);
  });

  describe('getPreferences', () => {
    it('should delegate to getPreferencesUseCase', async () => {
      const result = await service.getPreferences('user-123');

      expect(result).toEqual(mockPreferences);
      expect(mockUseCases.getPreferencesUseCase.execute).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updatePreferences', () => {
    it('should delegate to updatePreferencesUseCase', async () => {
      const updateData = { palette: 'sunset' };

      const result = await service.updatePreferences('user-123', updateData);

      expect(result).toBeUndefined();
      expect(mockUseCases.updatePreferencesUseCase.execute).toHaveBeenCalledWith(
        'user-123',
        updateData,
      );
    });
  });

  describe('getFullPreferences', () => {
    it('should delegate to getFullPreferencesUseCase', async () => {
      const result = await service.getFullPreferences('user-123');

      expect(result).toEqual(mockFullPreferences);
      expect(mockUseCases.getFullPreferencesUseCase.execute).toHaveBeenCalledWith('user-123');
    });

    it('should return empty object when preferences not found', async () => {
      mockUseCases.getFullPreferencesUseCase.execute = mock(async () => ({}));

      const result = await service.getFullPreferences('user-123');

      expect(result).toEqual({});
    });
  });

  describe('updateFullPreferences', () => {
    it('should delegate to updateFullPreferencesUseCase', async () => {
      const updateData = { theme: 'light', language: 'pt-BR' };

      const result = await service.updateFullPreferences('user-123', updateData);

      expect(result).toEqual(mockFullPreferences);
      expect(mockUseCases.updateFullPreferencesUseCase.execute).toHaveBeenCalledWith(
        'user-123',
        updateData,
      );
    });
  });
});
