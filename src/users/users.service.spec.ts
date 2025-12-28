import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { ResumesRepository } from '../resumes/resumes.repository';
import { AppLoggerService } from '../common/logger/logger.service';
import { ERROR_MESSAGES } from '../common/constants/app.constants';

describe('UsersService', () => {
  let service: UsersService;

  const mockUsersRepository = {
    getUser: jest.fn(),
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    getUserPreferences: jest.fn(),
    updateUserPreferences: jest.fn(),
    getFullUserPreferences: jest.fn(),
    upsertFullUserPreferences: jest.fn(),
    findByUsername: jest.fn(),
  };

  const mockResumesRepository = {
    findByUserId: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
        {
          provide: ResumesRepository,
          useValue: mockResumesRepository,
        },
        {
          provide: AppLoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublicProfileByUsername', () => {
    it('should return public profile and resume if user found and public', async () => {
      const username = 'publicuser';
      const mockUser = {
        id: 'user-1',
        preferences: { profileVisibility: 'public' },
        displayName: 'Public User',
      };
      const mockResume = { id: 'resume-1', title: 'Public Resume' };

      mockUsersRepository.findByUsername.mockResolvedValue(mockUser);
      mockResumesRepository.findByUserId.mockResolvedValue(mockResume);

      const result = await service.getPublicProfileByUsername(username);

      expect(result.user.displayName).toBe(mockUser.displayName);
      expect(result.resume).not.toBeNull();
      if (result.resume) {
        expect(result.resume.id).toBe(mockResume.id);
      }
      expect(mockUsersRepository.findByUsername).toHaveBeenCalledWith(username);
      expect(mockResumesRepository.findByUserId).toHaveBeenCalledWith(
        mockUser.id,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      const username = 'notfound';
      mockUsersRepository.findByUsername.mockResolvedValue(null);

      await expect(() =>
        service.getPublicProfileByUsername(username),
      ).rejects.toThrow(new NotFoundException('Public profile not found'));
    });

    it('should throw NotFoundException if profile is private', async () => {
      const username = 'privateuser';
      const mockUser = {
        id: 'user-2',
        preferences: { profileVisibility: 'private' },
      };
      mockUsersRepository.findByUsername.mockResolvedValue(mockUser);

      await expect(() =>
        service.getPublicProfileByUsername(username),
      ).rejects.toThrow(new NotFoundException('Public profile not found'));
    });
  });

  describe('getProfile', () => {
    it('should successfully get user profile', async () => {
      const userId = 'user-123';
      const mockProfile = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        displayName: 'Test',
        bio: 'Test bio',
        location: 'Test Location',
        phone: '1234567890',
        website: 'https://example.com',
        linkedin: 'testuser',
        github: 'testuser',
        photoURL: 'https://example.com/photo.jpg',
      };

      mockUsersRepository.getUserProfile.mockResolvedValue(mockProfile);

      const result = await service.getProfile(userId);

      expect(result).toEqual(mockProfile);
      expect(mockUsersRepository.getUserProfile).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException if user profile not found', async () => {
      const userId = 'invalid-user';
      mockUsersRepository.getUserProfile.mockResolvedValue(null);

      await expect(() => service.getProfile(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(() => service.getProfile(userId)).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND,
      );
    });
  });

  describe('updateProfile', () => {
    it('should successfully update user profile', async () => {
      const userId = 'user-123';
      const updateProfileDto = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
        location: 'Updated Location',
        phone: '9876543210',
        website: 'https://updated.com',
        linkedin: 'updateduser',
        github: 'updateduser',
      };

      const mockUser = { id: userId, email: 'test@example.com' };
      const mockUpdatedProfile = {
        ...mockUser,
        ...updateProfileDto,
        photoURL: 'https://example.com/photo.jpg',
      };

      mockUsersRepository.getUser.mockResolvedValue(mockUser);
      mockUsersRepository.updateUserProfile.mockResolvedValue(
        mockUpdatedProfile,
      );

      const result = await service.updateProfile(userId, updateProfileDto);

      expect(result).toEqual({
        success: true,
        user: {
          displayName: mockUpdatedProfile.displayName,
          photoURL: mockUpdatedProfile.photoURL,
          bio: mockUpdatedProfile.bio,
          location: mockUpdatedProfile.location,
          phone: mockUpdatedProfile.phone,
          website: mockUpdatedProfile.website,
          linkedin: mockUpdatedProfile.linkedin,
          github: mockUpdatedProfile.github,
        },
      });

      expect(mockUsersRepository.getUser).toHaveBeenCalledWith(userId);
      expect(mockUsersRepository.updateUserProfile).toHaveBeenCalledWith(
        userId,
        updateProfileDto,
      );
      expect(mockLoggerService.debug).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'invalid-user';
      const updateProfileDto = {
        displayName: 'Updated Name',
      };

      mockUsersRepository.getUser.mockResolvedValue(null);

      await expect(() =>
        service.updateProfile(userId, updateProfileDto),
      ).rejects.toThrow(NotFoundException);
      await expect(() =>
        service.updateProfile(userId, updateProfileDto),
      ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

      expect(mockUsersRepository.updateUserProfile).not.toHaveBeenCalled();
    });
  });

  describe('getPreferences', () => {
    it('should successfully get user preferences', async () => {
      const userId = 'user-123';
      const mockPreferences = {
        palette: 'blue',
        bannerColor: '#1a1a1a',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      };

      mockUsersRepository.getUserPreferences.mockResolvedValue(mockPreferences);

      const result = await service.getPreferences(userId);

      expect(result).toEqual(mockPreferences);
      expect(mockUsersRepository.getUserPreferences).toHaveBeenCalledWith(
        userId,
      );
    });

    it('should throw NotFoundException if preferences not found', async () => {
      const userId = 'invalid-user';
      mockUsersRepository.getUserPreferences.mockResolvedValue(null);

      await expect(() => service.getPreferences(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(() => service.getPreferences(userId)).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND,
      );
    });
  });

  describe('updatePreferences', () => {
    it('should successfully update user preferences', async () => {
      const userId = 'user-123';
      const updatePreferencesDto = {
        palette: 'green',
        bannerColor: '#2a2a2a',
        displayName: 'Updated User',
        photoURL: 'https://example.com/new-photo.jpg',
      };

      const mockUser = { id: userId, email: 'test@example.com' };

      mockUsersRepository.getUser.mockResolvedValue(mockUser);
      mockUsersRepository.updateUserPreferences.mockResolvedValue(undefined);

      const result = await service.updatePreferences(
        userId,
        updatePreferencesDto,
      );

      expect(result).toEqual({
        success: true,
        message: 'Preferences updated successfully',
      });

      expect(mockUsersRepository.getUser).toHaveBeenCalledWith(userId);
      expect(mockUsersRepository.updateUserPreferences).toHaveBeenCalledWith(
        userId,
        updatePreferencesDto,
      );
      expect(mockLoggerService.debug).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'invalid-user';
      const updatePreferencesDto = {
        palette: 'red',
      };

      mockUsersRepository.getUser.mockResolvedValue(null);

      await expect(() =>
        service.updatePreferences(userId, updatePreferencesDto),
      ).rejects.toThrow(NotFoundException);
      await expect(() =>
        service.updatePreferences(userId, updatePreferencesDto),
      ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

      expect(mockUsersRepository.updateUserPreferences).not.toHaveBeenCalled();
    });
  });

  describe('getFullPreferences', () => {
    it('should successfully get full user preferences', async () => {
      const userId = 'user-123';
      const mockFullPreferences = {
        theme: 'dark',
        palette: 'blue',
        bannerColor: '#1a1a1a',
        language: 'en',
        emailNotifications: true,
        marketingEmails: false,
        timezone: 'America/New_York',
      };

      mockUsersRepository.getFullUserPreferences.mockResolvedValue(
        mockFullPreferences,
      );

      const result = await service.getFullPreferences(userId);

      expect(result).toEqual(mockFullPreferences);
      expect(mockUsersRepository.getFullUserPreferences).toHaveBeenCalledWith(
        userId,
      );
    });

    it('should return empty object if preferences not found', async () => {
      const userId = 'user-123';
      mockUsersRepository.getFullUserPreferences.mockResolvedValue(null);

      const result = await service.getFullPreferences(userId);

      expect(result).toEqual({});
    });
  });

  describe('updateFullPreferences', () => {
    it('should successfully update full user preferences', async () => {
      const userId = 'user-123';
      const updateFullPreferencesDto = {
        theme: 'light',
        palette: 'green',
        bannerColor: '#2a2a2a',
        language: 'pt',
        emailNotifications: false,
        marketingEmails: true,
        timezone: 'Europe/London',
      };

      const mockUser = { id: userId, email: 'test@example.com' };
      const mockUpdatedPreferences = { ...updateFullPreferencesDto };

      mockUsersRepository.getUser.mockResolvedValue(mockUser);
      mockUsersRepository.upsertFullUserPreferences.mockResolvedValue(
        mockUpdatedPreferences,
      );

      const result = await service.updateFullPreferences(
        userId,
        updateFullPreferencesDto,
      );

      expect(result).toEqual({
        success: true,
        preferences: mockUpdatedPreferences,
      });

      expect(mockUsersRepository.getUser).toHaveBeenCalledWith(userId);
      expect(
        mockUsersRepository.upsertFullUserPreferences,
      ).toHaveBeenCalledWith(userId, updateFullPreferencesDto);
      expect(mockLoggerService.debug).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'invalid-user';
      const updateFullPreferencesDto = {
        theme: 'light',
      };

      mockUsersRepository.getUser.mockResolvedValue(null);

      await expect(() =>
        service.updateFullPreferences(userId, updateFullPreferencesDto),
      ).rejects.toThrow(NotFoundException);
      await expect(() =>
        service.updateFullPreferences(userId, updateFullPreferencesDto),
      ).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);

      expect(
        mockUsersRepository.upsertFullUserPreferences,
      ).not.toHaveBeenCalled();
    });
  });
});
