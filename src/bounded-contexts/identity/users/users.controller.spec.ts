/**
 * Users Controller Unit Tests
 *
 * Tests the users controller endpoints for profile and preferences management.
 * Focus: Request handling, parameter validation, service delegation.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Controllers should be thin, delegating to services"
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { UsersController } from './users.controller';
import type { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: Record<string, ReturnType<typeof mock>>;

  const mockUser: UserPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    hasCompletedOnboarding: false,
  };

  const mockProfile = {
    id: mockUser.userId,
    email: 'test@example.com',
    displayName: 'Test User',
    username: 'testuser',
    photoURL: 'https://example.com/photo.jpg',
    bio: 'Software engineer',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };

  const mockPublicProfileResult = {
    user: {
      displayName: mockProfile.displayName,
      photoURL: mockProfile.photoURL,
      bio: mockProfile.bio,
      location: 'Remote',
    },
  };

  const mockPublicProfileResponse = {
    username: 'testuser',
    displayName: mockProfile.displayName,
    photoURL: mockProfile.photoURL,
    bio: mockProfile.bio,
    location: 'Remote',
  };

  const mockPreferences = {
    palette: 'dark',
    bannerColor: '#111111',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    language: 'en',
    emailNotifications: true,
  };

  const mockPreferencesResponse = {
    palette: mockPreferences.palette,
    bannerColor: mockPreferences.bannerColor,
    displayName: mockPreferences.displayName,
    photoURL: mockPreferences.photoURL,
  };

  beforeEach(() => {
    mockUsersService = {
      getProfile: mock(() => Promise.resolve(mockProfile)),
      getPublicProfileByUsername: mock(() => Promise.resolve(mockPublicProfileResult)),
      updateProfile: mock(() => Promise.resolve(mockProfile)),
      getPreferences: mock(() => Promise.resolve(mockPreferences)),
      updatePreferences: mock(() => Promise.resolve(undefined)),
      getFullPreferences: mock(() => Promise.resolve(mockPreferences)),
      updateFullPreferences: mock(() => Promise.resolve(mockPreferences)),
      checkUsernameAvailability: mock(() =>
        Promise.resolve({ username: 'testuser', available: true }),
      ),
      updateUsername: mock(() =>
        Promise.resolve({
          username: 'newusername',
          message: 'Username updated',
        }),
      ),
    };

    controller = new UsersController(mockUsersService as unknown as UsersService);
  });

  describe('getPublicProfileByUsername', () => {
    it('should return public profile for username', async () => {
      const result = await controller.getPublicProfileByUsername('testuser');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPublicProfileResponse);
      expect(mockUsersService.getPublicProfileByUsername).toHaveBeenCalledWith('testuser');
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      const result = await controller.getProfile(mockUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProfile);
      expect(mockUsersService.getProfile).toHaveBeenCalledWith(mockUser.userId);
    });
  });

  describe('updateProfile', () => {
    it('should update and return user profile', async () => {
      const updateData = { displayName: 'Updated Name', bio: 'New bio' };

      const result = await controller.updateProfile(mockUser, updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProfile);
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(mockUser.userId, updateData);
    });
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      const result = await controller.getPreferences(mockUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPreferencesResponse);
      expect(mockUsersService.getPreferences).toHaveBeenCalledWith(mockUser.userId);
    });
  });

  describe('updatePreferences', () => {
    it('should update and return preferences', async () => {
      const updateData = { palette: 'sunset' };

      const result = await controller.updatePreferences(mockUser, updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPreferencesResponse);
      expect(mockUsersService.updatePreferences).toHaveBeenCalledWith(mockUser.userId, updateData);
      expect(mockUsersService.getPreferences).toHaveBeenCalledWith(mockUser.userId);
    });
  });
});
