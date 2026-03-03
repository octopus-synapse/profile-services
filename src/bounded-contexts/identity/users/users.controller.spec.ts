/**
 * Users Controller Unit Tests
 *
 * Tests the users controller endpoints for profile and preferences management.
 * Focus: Request handling, parameter validation, service delegation.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Controllers should be thin, delegating to services"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { UsersController } from './users.controller';
import type { UsersService } from './users.service';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: any;

  const mockUser: UserPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    hasCompletedOnboarding: false,
  };

  const mockProfile = {
    id: mockUser.userId,
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    image: null,
    bio: 'Software engineer',
  };

  const mockPreferences = {
    theme: 'dark',
    language: 'en',
    emailNotifications: true,
  };

  beforeEach(() => {
    mockUsersService = {
      getProfile: mock(() => Promise.resolve(mockProfile)),
      getPublicProfileByUsername: mock(() => Promise.resolve(mockProfile)),
      updateProfile: mock(() => Promise.resolve(mockProfile)),
      getPreferences: mock(() => Promise.resolve(mockPreferences)),
      updatePreferences: mock(() => Promise.resolve(mockPreferences)),
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

    controller = new UsersController(mockUsersService as UsersService);
  });

  describe('getPublicProfileByUsername', () => {
    it('should return public profile for username', async () => {
      const result = await controller.getPublicProfileByUsername('testuser');

      expect(result.success).toBe(true);
      expect(result.data as any).toEqual(mockProfile as any);
      expect(mockUsersService.getPublicProfileByUsername).toHaveBeenCalledWith(
        'testuser',
      );
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      const result = await controller.getProfile(mockUser);

      expect(result.success).toBe(true);
      expect(result.data as any).toEqual(mockProfile as any);
      expect(mockUsersService.getProfile).toHaveBeenCalledWith(mockUser.userId);
    });
  });

  describe('updateProfile', () => {
    it('should update and return user profile', async () => {
      const updateData = { displayName: 'Updated Name', bio: 'New bio' };

      const result = await controller.updateProfile(mockUser, updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProfile as any);
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        mockUser.userId,
        updateData,
      );
    });
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      const result = await controller.getPreferences(mockUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPreferences as any);
      expect(mockUsersService.getPreferences).toHaveBeenCalledWith(
        mockUser.userId,
      );
    });
  });

  describe('updatePreferences', () => {
    it('should update and return preferences', async () => {
      const updateData = { palette: 'sunset' };

      const result = await controller.updatePreferences(mockUser, updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPreferences as any);
      expect(mockUsersService.updatePreferences).toHaveBeenCalledWith(
        mockUser.userId,
        updateData,
      );
    });
  });
});
