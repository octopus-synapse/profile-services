import { Test, TestingModule } from '@nestjs/testing';
import { UsernameService } from './username.service';
import { UsersRepository } from '../users.repository';
import { AppLoggerService } from '../../common/logger/logger.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ERROR_MESSAGES } from '../../common/constants/config';

describe('UsernameService', () => {
  let service: UsernameService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let logger: jest.Mocked<AppLoggerService>;

  beforeEach(async () => {
    usersRepository = {
      getUser: jest.fn(),
      updateUsername: jest.fn(),
      isUsernameTaken: jest.fn(),
      getLastUsernameUpdate: jest.fn(),
    } as any;

    logger = {
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsernameService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: AppLoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<UsernameService>(UsernameService);
  });

  describe('updateUsername', () => {
    it('should update username successfully when all conditions are met', async () => {
      const userId = 'user-123';
      const updateDto = { username: 'NewUsername' };
      const mockUser = { id: userId, username: 'oldusername' };
      const mockUpdatedUser = { id: userId, username: 'newusername' };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.getLastUsernameUpdate.mockResolvedValue(null);
      usersRepository.isUsernameTaken.mockResolvedValue(false);
      usersRepository.updateUsername.mockResolvedValue(mockUpdatedUser as any);

      const result = await service.updateUsername(userId, updateDto);

      expect(result).toEqual({
        success: true,
        message: 'Username updated successfully',
        username: 'newusername',
      });
      expect(usersRepository.updateUsername).toHaveBeenCalledWith(
        userId,
        'newusername',
      );
      expect(logger.debug).toHaveBeenCalledWith('Username updated', 'UsernameService', {
        userId,
        oldUsername: 'oldusername',
        newUsername: 'newusername',
      });
    });

    it('should normalize username to lowercase', async () => {
      const userId = 'user-123';
      const updateDto = { username: 'MixedCaseUsername' };
      const mockUser = { id: userId, username: 'oldusername' };
      const mockUpdatedUser = { id: userId, username: 'mixedcaseusername' };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.getLastUsernameUpdate.mockResolvedValue(null);
      usersRepository.isUsernameTaken.mockResolvedValue(false);
      usersRepository.updateUsername.mockResolvedValue(mockUpdatedUser as any);

      await service.updateUsername(userId, updateDto);

      expect(usersRepository.updateUsername).toHaveBeenCalledWith(
        userId,
        'mixedcaseusername',
      );
    });

    it('should return success with unchanged message when username is the same', async () => {
      const userId = 'user-123';
      const updateDto = { username: 'sameusername' };
      const mockUser = { id: userId, username: 'sameusername' };

      usersRepository.getUser.mockResolvedValue(mockUser as any);

      const result = await service.updateUsername(userId, updateDto);

      expect(result).toEqual({
        success: true,
        message: 'Username unchanged',
        username: 'sameusername',
      });
      expect(usersRepository.getLastUsernameUpdate).not.toHaveBeenCalled();
      expect(usersRepository.isUsernameTaken).not.toHaveBeenCalled();
      expect(usersRepository.updateUsername).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive username comparison', async () => {
      const userId = 'user-123';
      const updateDto = { username: 'USERNAME' };
      const mockUser = { id: userId, username: 'username' };

      usersRepository.getUser.mockResolvedValue(mockUser as any);

      const result = await service.updateUsername(userId, updateDto);

      expect(result.message).toBe('Username unchanged');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const updateDto = { username: 'newusername' };

      usersRepository.getUser.mockResolvedValue(null);

      await expect(
        service.updateUsername('nonexistent-id', updateDto),
      ).rejects.toThrow(new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND));

      expect(usersRepository.updateUsername).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when cooldown period has not passed', async () => {
      const userId = 'user-123';
      const updateDto = { username: 'newusername' };
      const mockUser = { id: userId, username: 'oldusername' };
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.getLastUsernameUpdate.mockResolvedValue(recentDate);

      await expect(service.updateUsername(userId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateUsername(userId, updateDto)).rejects.toThrow(
        /wait 20 more day/,
      );

      expect(usersRepository.updateUsername).not.toHaveBeenCalled();
    });

    it('should allow update when cooldown period has passed', async () => {
      const userId = 'user-123';
      const updateDto = { username: 'newusername' };
      const mockUser = { id: userId, username: 'oldusername' };
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      const mockUpdatedUser = { id: userId, username: 'newusername' };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.getLastUsernameUpdate.mockResolvedValue(oldDate);
      usersRepository.isUsernameTaken.mockResolvedValue(false);
      usersRepository.updateUsername.mockResolvedValue(mockUpdatedUser as any);

      const result = await service.updateUsername(userId, updateDto);

      expect(result.success).toBe(true);
      expect(usersRepository.updateUsername).toHaveBeenCalled();
    });

    it('should throw ConflictException when username is already taken', async () => {
      const userId = 'user-123';
      const updateDto = { username: 'takenusername' };
      const mockUser = { id: userId, username: 'oldusername' };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.getLastUsernameUpdate.mockResolvedValue(null);
      usersRepository.isUsernameTaken.mockResolvedValue(true);

      await expect(service.updateUsername(userId, updateDto)).rejects.toThrow(
        new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_IN_USE),
      );

      expect(usersRepository.updateUsername).not.toHaveBeenCalled();
    });

    it('should check username availability excluding current user', async () => {
      const userId = 'user-123';
      const updateDto = { username: 'newusername' };
      const mockUser = { id: userId, username: 'oldusername' };
      const mockUpdatedUser = { id: userId, username: 'newusername' };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.getLastUsernameUpdate.mockResolvedValue(null);
      usersRepository.isUsernameTaken.mockResolvedValue(false);
      usersRepository.updateUsername.mockResolvedValue(mockUpdatedUser as any);

      await service.updateUsername(userId, updateDto);

      expect(usersRepository.isUsernameTaken).toHaveBeenCalledWith(
        'newusername',
        userId,
      );
    });
  });

  describe('checkUsernameAvailability', () => {
    it('should return available true when username is not taken', async () => {
      usersRepository.isUsernameTaken.mockResolvedValue(false);

      const result = await service.checkUsernameAvailability('availableuser');

      expect(result).toEqual({
        username: 'availableuser',
        available: true,
      });
      expect(usersRepository.isUsernameTaken).toHaveBeenCalledWith(
        'availableuser',
        undefined,
      );
    });

    it('should return available false when username is taken', async () => {
      usersRepository.isUsernameTaken.mockResolvedValue(true);

      const result = await service.checkUsernameAvailability('takenuser');

      expect(result).toEqual({
        username: 'takenuser',
        available: false,
      });
    });

    it('should normalize username to lowercase when checking availability', async () => {
      usersRepository.isUsernameTaken.mockResolvedValue(false);

      const result = await service.checkUsernameAvailability('MixedCase');

      expect(result.username).toBe('mixedcase');
      expect(usersRepository.isUsernameTaken).toHaveBeenCalledWith(
        'mixedcase',
        undefined,
      );
    });

    it('should pass userId when checking availability for current user', async () => {
      const userId = 'user-123';
      usersRepository.isUsernameTaken.mockResolvedValue(false);

      await service.checkUsernameAvailability('username', userId);

      expect(usersRepository.isUsernameTaken).toHaveBeenCalledWith(
        'username',
        userId,
      );
    });

    it('should handle special characters in username', async () => {
      usersRepository.isUsernameTaken.mockResolvedValue(false);

      const result = await service.checkUsernameAvailability('user_name-123');

      expect(result.username).toBe('user_name-123');
      expect(result.available).toBe(true);
    });
  });

  describe('cooldown validation', () => {
    it('should throw error with correct remaining days when cooldown active', async () => {
      const userId = 'user-123';
      const updateDto = { username: 'newusername' };
      const mockUser = { id: userId, username: 'oldusername' };
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.getLastUsernameUpdate.mockResolvedValue(fiveDaysAgo);

      await expect(service.updateUsername(userId, updateDto)).rejects.toThrow(
        /wait 25 more day/,
      );
    });

    it('should allow update exactly after 30 days', async () => {
      const userId = 'user-123';
      const updateDto = { username: 'newusername' };
      const mockUser = { id: userId, username: 'oldusername' };
      const exactlyThirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const mockUpdatedUser = { id: userId, username: 'newusername' };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.getLastUsernameUpdate.mockResolvedValue(exactlyThirtyDaysAgo);
      usersRepository.isUsernameTaken.mockResolvedValue(false);
      usersRepository.updateUsername.mockResolvedValue(mockUpdatedUser as any);

      const result = await service.updateUsername(userId, updateDto);

      expect(result.success).toBe(true);
    });

    it('should allow first-time username update when no previous update exists', async () => {
      const userId = 'user-123';
      const updateDto = { username: 'firstusername' };
      const mockUser = { id: userId, username: 'oldusername' };
      const mockUpdatedUser = { id: userId, username: 'firstusername' };

      usersRepository.getUser.mockResolvedValue(mockUser as any);
      usersRepository.getLastUsernameUpdate.mockResolvedValue(null);
      usersRepository.isUsernameTaken.mockResolvedValue(false);
      usersRepository.updateUsername.mockResolvedValue(mockUpdatedUser as any);

      const result = await service.updateUsername(userId, updateDto);

      expect(result.success).toBe(true);
      expect(usersRepository.getLastUsernameUpdate).toHaveBeenCalledWith(userId);
    });
  });
});
