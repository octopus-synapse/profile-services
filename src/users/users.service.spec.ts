/**
 * UsersService Tests (Facade)
 *
 * NOTA (Uncle Bob): UsersService é um facade puro - apenas delega para serviços especializados.
 * Estes testes verificam COMPORTAMENTO (outputs), não IMPLEMENTAÇÃO (chamadas internas).
 *
 * Testes detalhados de regras de negócio estão nos serviços especializados:
 * - user-profile.service.spec.ts
 * - user-preferences.service.spec.ts
 * - username.service.spec.ts
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UserProfileService } from './services/user-profile.service';
import { UserPreferencesService } from './services/user-preferences.service';
import { UsernameService } from './services/username.service';

describe('UsersService (Facade)', () => {
  let service: UsersService;

  // Stubs com retornos fixos (não mocks para verificar chamadas)
  const stubProfileService = {
    getPublicProfileByUsername: mock().mockResolvedValue({
      user: {
        id: 'user-123',
        displayName: 'Public User',
        username: 'publicuser',
      },
      resume: { id: 'resume-123', title: 'Software Engineer' },
    }),
    getProfile: mock().mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      displayName: 'Test',
      bio: 'A developer',
    }),
    updateProfile: mock().mockResolvedValue({
      success: true,
      data: {
        id: 'user-123',
        displayName: 'Updated Name',
        bio: 'Updated bio',
      },
    }),
  };

  const stubPreferencesService = {
    getPreferences: mock().mockResolvedValue({
      palette: 'blue',
      bannerColor: '#1a1a1a',
    }),
    updatePreferences: mock().mockResolvedValue({
      success: true,
      message: 'Preferences updated successfully',
    }),
    getFullPreferences: mock().mockResolvedValue({
      theme: 'dark',
      palette: 'blue',
      language: 'en',
      bannerColor: '#1a1a1a',
    }),
    updateFullPreferences: mock().mockResolvedValue({
      success: true,
      data: { theme: 'light', palette: 'green' },
    }),
  };

  const stubUsernameService = {
    updateUsername: mock().mockResolvedValue({
      success: true,
      username: 'newusername',
    }),
    checkUsernameAvailability: mock().mockResolvedValue({
      available: true,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserProfileService, useValue: stubProfileService },
        { provide: UserPreferencesService, useValue: stubPreferencesService },
        { provide: UsernameService, useValue: stubUsernameService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ==================== Profile Operations ====================

  describe('getPublicProfileByUsername', () => {
    it('should return public profile with user and resume data', async () => {
      const result = await service.getPublicProfileByUsername('publicuser');

      expect(result).toMatchObject({
        user: expect.objectContaining({
          id: expect.any(String),
          displayName: expect.any(String),
        }),
        resume: expect.objectContaining({
          id: expect.any(String),
        }),
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile with expected fields', async () => {
      const result = await service.getProfile('user-123');

      expect(result).toMatchObject({
        id: expect.any(String),
        email: expect.any(String),
        name: expect.any(String),
      });
    });
  });

  describe('updateProfile', () => {
    it('should return success with updated profile data', async () => {
      const updateDto = { displayName: 'Updated Name', bio: 'Updated bio' };

      const result = await service.updateProfile('user-123', updateDto);

      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          displayName: expect.any(String),
        }),
      });
    });
  });

  // ==================== Preferences Operations ====================

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      const result = await service.getPreferences('user-123');

      expect(result).toMatchObject({
        palette: expect.any(String),
      });
    });
  });

  describe('updatePreferences', () => {
    it('should return success when preferences are updated', async () => {
      const updateDto = { palette: 'green', bannerColor: '#2a2a2a' };

      const result = await service.updatePreferences('user-123', updateDto);

      expect(result).toMatchObject({
        success: true,
      });
    });
  });

  describe('getFullPreferences', () => {
    it('should return complete preferences object', async () => {
      const result = await service.getFullPreferences('user-123');

      expect(result).toMatchObject({
        theme: expect.any(String),
        palette: expect.any(String),
        language: expect.any(String),
      });
    });
  });

  describe('updateFullPreferences', () => {
    it('should return success when full preferences are updated', async () => {
      const updateDto = { theme: 'light', palette: 'green' };

      const result = await service.updateFullPreferences('user-123', updateDto);

      expect(result).toMatchObject({
        success: true,
      });
    });
  });

  // ==================== Username Operations ====================

  describe('updateUsername', () => {
    it('should return success with new username', async () => {
      const updateDto = { username: 'newusername' };

      const result = await service.updateUsername('user-123', updateDto);

      expect(result).toMatchObject({
        success: true,
        username: expect.any(String),
      });
    });
  });

  describe('checkUsernameAvailability', () => {
    it('should return availability status', async () => {
      const result = await service.checkUsernameAvailability('newusername');

      expect(result).toMatchObject({
        available: expect.any(Boolean),
      });
    });
  });
});
