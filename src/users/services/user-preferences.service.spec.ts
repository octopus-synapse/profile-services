import { Test, TestingModule } from '@nestjs/testing';
import { UserPreferencesService } from './user-preferences.service';
import { UsersRepository } from '../users.repository';
import { AppLoggerService } from '../../common/logger/logger.service';
import { NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../../common/constants/config';

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let logger: jest.Mocked<AppLoggerService>;

  beforeEach(async () => {
    usersRepository = {
      getUser: jest.fn(),
      getUserPreferences: jest.fn(),
      updateUserPreferences: jest.fn(),
      getFullUserPreferences: jest.fn(),
      upsertFullUserPreferences: jest.fn(),
    } as any;

    logger = {
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPreferencesService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: AppLoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<UserPreferencesService>(UserPreferencesService);
  });

  describe('getPreferences', () => {
    it('should return user preferences when they exist', async () => {
      const mockPreferences = {
        profileVisibility: 'public',
        theme: 'dark',
        language: 'en',
        emailNotifications: true,
      };

      usersRepository.getUserPreferences.mockResolvedValue(
        mockPreferences as any,
      );

      const result = await service.getPreferences('user-123');

      expect(result).toEqual(mockPreferences);
      expect(usersRepository.getUserPreferences).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should throw NotFoundException when preferences do not exist', async () => {
      usersRepository.getUserPreferences.mockResolvedValue(null);

      await expect(service.getPreferences('nonexistent-id')).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND),
      );
    });

    it('should return empty preferences object when user exists but has no preferences', async () => {
      const mockPreferences = {};

      usersRepository.getUserPreferences.mockResolvedValue(
        mockPreferences as any,
      );

      const result = await service.getPreferences('user-123');

      expect(result).toEqual({});
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences successfully', async () => {
      const userId = 'user-123';
      const updateDto = {
        palette: 'blue',
        bannerColor: '#003366',
      };
      const mockUser = { id: userId, username: 'johndoe' };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.updateUserPreferences.mockResolvedValue(undefined);

      const result = await service.updatePreferences(userId, updateDto);

      expect(result).toEqual({
        success: true,
        message: 'Preferences updated successfully',
      });
      expect(usersRepository.updateUserPreferences).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'User preferences updated',
        'UserPreferencesService',
        { userId },
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const updateDto = { palette: 'green' };

      usersRepository.getUser.mockResolvedValue(null);

      await expect(
        service.updatePreferences('nonexistent-id', updateDto),
      ).rejects.toThrow(new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND));

      expect(usersRepository.updateUserPreferences).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should handle partial preference updates', async () => {
      const userId = 'user-123';
      const updateDto = { displayName: 'New Display Name' };
      const mockUser = { id: userId };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.updateUserPreferences.mockResolvedValue(undefined);

      const result = await service.updatePreferences(userId, updateDto);

      expect(result.success).toBe(true);
      expect(usersRepository.updateUserPreferences).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
    });

    it('should handle all preference fields in update', async () => {
      const userId = 'user-123';
      const updateDto = {
        palette: 'red',
        bannerColor: '#FF0000',
        displayName: 'John Doe',
        photoURL: 'https://example.com/photo.jpg',
      };
      const mockUser = { id: userId };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.updateUserPreferences.mockResolvedValue(undefined);

      await service.updatePreferences(userId, updateDto);

      expect(usersRepository.updateUserPreferences).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
    });
  });

  describe('getFullPreferences', () => {
    it('should return full user preferences when they exist', async () => {
      const mockFullPreferences = {
        profileVisibility: 'public',
        theme: 'dark',
        language: 'en',
        emailNotifications: true,
        newsletterSubscription: false,
        twoFactorEnabled: true,
      };

      usersRepository.getFullUserPreferences.mockResolvedValue(
        mockFullPreferences as any,
      );

      const result = await service.getFullPreferences('user-123');

      expect(result).toEqual(mockFullPreferences);
      expect(usersRepository.getFullUserPreferences).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should return empty object when full preferences do not exist', async () => {
      usersRepository.getFullUserPreferences.mockResolvedValue(null);

      const result = await service.getFullPreferences('user-123');

      expect(result).toEqual({});
    });

    it('should return empty object when full preferences are undefined', async () => {
      usersRepository.getFullUserPreferences.mockResolvedValue(
        undefined as any,
      );

      const result = await service.getFullPreferences('user-123');

      expect(result).toEqual({});
    });
  });

  describe('updateFullPreferences', () => {
    it('should update full user preferences successfully', async () => {
      const userId = 'user-123';
      const updateDto = {
        profileVisibility: 'private',
        theme: 'light',
        language: 'pt',
        emailNotifications: false,
      };
      const mockUser = { id: userId };
      const mockUpdatedPreferences = {
        ...updateDto,
        marketingEmails: true,
      };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.upsertFullUserPreferences.mockResolvedValue(
        mockUpdatedPreferences as any,
      );

      const result = await service.updateFullPreferences(userId, updateDto);

      expect(result).toEqual({
        success: true,
        preferences: mockUpdatedPreferences,
      });
      expect(usersRepository.upsertFullUserPreferences).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'User full preferences updated',
        'UserPreferencesService',
        { userId },
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const updateDto = { theme: 'dark' };

      usersRepository.getUser.mockResolvedValue(null);

      await expect(
        service.updateFullPreferences('nonexistent-id', updateDto),
      ).rejects.toThrow(new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND));

      expect(usersRepository.upsertFullUserPreferences).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should handle creation of new full preferences (upsert behavior)', async () => {
      const userId = 'user-123';
      const updateDto = {
        profileVisibility: 'public',
        theme: 'dark',
      };
      const mockUser = { id: userId };
      const mockNewPreferences = updateDto;

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.upsertFullUserPreferences.mockResolvedValue(
        mockNewPreferences as any,
      );

      const result = await service.updateFullPreferences(userId, updateDto);

      expect(result.success).toBe(true);
      expect(result.preferences).toEqual(mockNewPreferences);
    });

    it('should handle complete preference set in update', async () => {
      const userId = 'user-123';
      const updateDto = {
        profileVisibility: 'public',
        theme: 'dark',
        language: 'en',
        emailNotifications: true,
        marketingEmails: false,
        timezone: 'America/New_York',
        palette: 'blue',
        bannerColor: '#003366',
      };
      const mockUser = { id: userId };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.upsertFullUserPreferences.mockResolvedValue(
        updateDto as any,
      );

      const result = await service.updateFullPreferences(userId, updateDto);

      expect(result.preferences).toMatchObject(updateDto);
      expect(usersRepository.upsertFullUserPreferences).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
    });
  });
});
