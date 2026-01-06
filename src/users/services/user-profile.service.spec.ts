import { Test, TestingModule } from '@nestjs/testing';
import { UserProfileService } from './user-profile.service';
import { UsersRepository } from '../users.repository';
import { ResumesRepository } from '../../resumes/resumes.repository';
import { AppLoggerService } from '../../common/logger/logger.service';
import { NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../../common/constants/config';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let resumesRepository: jest.Mocked<ResumesRepository>;
  let logger: jest.Mocked<AppLoggerService>;

  beforeEach(async () => {
    usersRepository = {
      findByUsername: jest.fn(),
      getUserProfile: jest.fn(),
      getUser: jest.fn(),
      updateUserProfile: jest.fn(),
    } as any;

    resumesRepository = {
      findByUserId: jest.fn(),
    } as any;

    logger = {
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: ResumesRepository, useValue: resumesRepository },
        { provide: AppLoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
  });

  describe('getPublicProfileByUsername', () => {
    it('should return public profile when user exists and profile is public', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'johndoe',
        displayName: 'John Doe',
        photoURL: 'https://example.com/photo.jpg',
        bio: 'Software Engineer',
        location: 'San Francisco, CA',
        website: 'https://johndoe.com',
        linkedin: 'johndoe',
        github: 'johndoe',
        preferences: {
          profileVisibility: 'public',
        },
      };
      const mockResume = { id: 'resume-123', title: 'My Resume' };

      usersRepository.findByUsername.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(mockResume as any);

      const result = await service.getPublicProfileByUsername('johndoe');

      expect(result).toEqual({
        user: {
          displayName: 'John Doe',
          photoURL: 'https://example.com/photo.jpg',
          bio: 'Software Engineer',
          location: 'San Francisco, CA',
          website: 'https://johndoe.com',
          linkedin: 'johndoe',
          github: 'johndoe',
        },
        resume: mockResume,
      });
      expect(usersRepository.findByUsername).toHaveBeenCalledWith('johndoe');
      expect(resumesRepository.findByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      usersRepository.findByUsername.mockResolvedValue(null);

      await expect(
        service.getPublicProfileByUsername('nonexistent'),
      ).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.PUBLIC_PROFILE_NOT_FOUND),
      );

      expect(resumesRepository.findByUserId).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when profile visibility is private', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'private-user',
        preferences: {
          profileVisibility: 'private',
        },
      };

      usersRepository.findByUsername.mockResolvedValue(mockUser as any);

      await expect(
        service.getPublicProfileByUsername('private-user'),
      ).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.PUBLIC_PROFILE_NOT_FOUND),
      );

      expect(resumesRepository.findByUserId).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when profile visibility is undefined', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'no-prefs-user',
        preferences: undefined,
      };

      usersRepository.findByUsername.mockResolvedValue(mockUser as any);

      await expect(
        service.getPublicProfileByUsername('no-prefs-user'),
      ).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.PUBLIC_PROFILE_NOT_FOUND),
      );
    });

    it('should return profile with null resume when user has no resume', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'no-resume-user',
        displayName: 'No Resume User',
        preferences: {
          profileVisibility: 'public',
        },
      };

      usersRepository.findByUsername.mockResolvedValue(mockUser as any);
      resumesRepository.findByUserId.mockResolvedValue(null);

      const result = await service.getPublicProfileByUsername('no-resume-user');

      expect(result.resume).toBeNull();
      expect(result.user.displayName).toBe('No Resume User');
    });
  });

  describe('getProfile', () => {
    it('should return user profile for valid userId', async () => {
      const mockProfile = {
        id: 'user-123',
        displayName: 'John Doe',
        email: 'john@example.com',
        photoURL: 'https://example.com/photo.jpg',
        preferences: {
          profileVisibility: 'public',
          theme: 'dark',
        },
      };

      usersRepository.getUserProfile.mockResolvedValue(mockProfile as any);

      const result = await service.getProfile('user-123');

      expect(result).toEqual(mockProfile);
      expect(usersRepository.getUserProfile).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      usersRepository.getUserProfile.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND),
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user-123';
      const updateDto = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
        location: 'New York',
      };
      const mockUser = { id: userId, username: 'johndoe' };
      const mockUpdatedUser = {
        id: userId,
        displayName: 'Updated Name',
        bio: 'Updated bio',
        photoURL: 'https://example.com/photo.jpg',
        location: 'New York',
      };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.updateUserProfile.mockResolvedValue(
        mockUpdatedUser as any,
      );

      const result = await service.updateProfile(userId, updateDto);

      expect(result).toEqual({
        success: true,
        user: {
          displayName: 'Updated Name',
          photoURL: 'https://example.com/photo.jpg',
          bio: 'Updated bio',
          location: 'New York',
        },
      });
      expect(usersRepository.updateUserProfile).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'User profile updated',
        'UserProfileService',
        { userId },
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const updateDto = { displayName: 'New Name' };

      usersRepository.getUser.mockResolvedValue(null);

      await expect(
        service.updateProfile('nonexistent-id', updateDto),
      ).rejects.toThrow(new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND));

      expect(usersRepository.updateUserProfile).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should handle partial profile updates', async () => {
      const userId = 'user-123';
      const updateDto = { bio: 'Only updating bio' };
      const mockUser = { id: userId };
      const mockUpdatedUser = {
        id: userId,
        displayName: 'Existing Name',
        bio: 'Only updating bio',
      };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.updateUserProfile.mockResolvedValue(
        mockUpdatedUser as any,
      );

      const result = await service.updateProfile(userId, updateDto);

      expect(result.success).toBe(true);
      expect(result.user.bio).toBe('Only updating bio');
    });

    it('should handle all profile fields in update', async () => {
      const userId = 'user-123';
      const updateDto = {
        displayName: 'Complete Update',
        bio: 'Full bio',
        location: 'Remote',
        website: 'https://newsite.com',
        linkedin: 'newlinkedin',
        github: 'newgithub',
        photoURL: 'https://newphoto.com/photo.jpg',
      };
      const mockUser = { id: userId };
      const mockUpdatedUser = { id: userId, ...updateDto };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.updateUserProfile.mockResolvedValue(
        mockUpdatedUser as any,
      );

      const result = await service.updateProfile(userId, updateDto);

      expect(result.user).toMatchObject({
        displayName: 'Complete Update',
        bio: 'Full bio',
        location: 'Remote',
      });
    });
  });
});
