/**
 * Username Service Unit Tests
 *
 * These tests verify the ACTUAL service behavior, not fake helper functions.
 * Uncle Bob: "Test the system, not your imagination of the system."
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsernameService } from './username.service';
import { UsersRepository } from '@/bounded-contexts/identity/users/users.repository';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';

describe('UsernameService', () => {
  let service: UsernameService;
  let mockUsersRepository: UsersRepository;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'existinguser',
    usernameUpdatedAt: null,
  } as any;

  beforeEach(async () => {
    mockUsersRepository = {
      findUserById: mock().mockResolvedValue(mockUser),
      updateUsername: mock().mockResolvedValue({
        ...mockUser,
        username: 'newuser',
      }),
      isUsernameTaken: mock().mockResolvedValue(false),
      findLastUsernameUpdateByUserId: mock().mockResolvedValue(null),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsernameService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        {
          provide: AppLoggerService,
          useValue: { debug: mock(), warn: mock() },
        },
      ],
    }).compile();

    service = module.get<UsernameService>(UsernameService);
  });

  describe('updateUsername', () => {
    describe('User validation', () => {
      it('should throw NotFoundException when user does not exist', async () => {
        mockUsersRepository.findUserById.mockResolvedValue(null);

        await expect(
          service.updateUsername('nonexistent', { username: 'newuser' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should return success when username is unchanged', async () => {
        const result = await service.updateUsername('user-123', {
          username: 'existinguser',
        });

        expect(result.success).toBe(true);
        expect(result.message).toBe('Username unchanged');
        expect(mockUsersRepository.updateUsername.mock.calls.length).toBe(0);
      });
    });

    describe('Username format validation', () => {
      it('should reject uppercase letters', async () => {
        await expect(
          service.updateUsername('user-123', { username: 'TestUser' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject usernames starting with number', async () => {
        await expect(
          service.updateUsername('user-123', { username: '123user' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject special characters', async () => {
        await expect(
          service.updateUsername('user-123', { username: 'user@name' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject consecutive underscores', async () => {
        await expect(
          service.updateUsername('user-123', { username: 'user__name' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject trailing underscore', async () => {
        await expect(
          service.updateUsername('user-123', { username: 'username_' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should accept valid lowercase username', async () => {
        const result = await service.updateUsername('user-123', {
          username: 'validuser',
        });
        expect(result.success).toBe(true);
      });

      it('should accept username with numbers', async () => {
        const result = await service.updateUsername('user-123', {
          username: 'user123',
        });
        expect(result.success).toBe(true);
      });

      it('should accept username with single underscores', async () => {
        const result = await service.updateUsername('user-123', {
          username: 'user_name',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('Reserved username validation', () => {
      it('should reject "admin"', async () => {
        await expect(
          service.updateUsername('user-123', { username: 'admin' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject "api"', async () => {
        await expect(
          service.updateUsername('user-123', { username: 'api' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject "www"', async () => {
        await expect(
          service.updateUsername('user-123', { username: 'www' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject "support"', async () => {
        await expect(
          service.updateUsername('user-123', { username: 'support' }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('Cooldown validation', () => {
      it('should allow when never changed before (null)', async () => {
        mockUsersRepository.findLastUsernameUpdateByUserId.mockResolvedValue(
          null,
        );

        const result = await service.updateUsername('user-123', {
          username: 'newuser',
        });
        expect(result.success).toBe(true);
      });

      it('should reject within 30 days of last change', async () => {
        const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
        mockUsersRepository.findLastUsernameUpdateByUserId.mockResolvedValue(
          fifteenDaysAgo,
        );

        await expect(
          service.updateUsername('user-123', { username: 'newuser' }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should allow after 30 days', async () => {
        const thirtyOneDaysAgo = new Date(
          Date.now() - 31 * 24 * 60 * 60 * 1000,
        );
        mockUsersRepository.findLastUsernameUpdateByUserId.mockResolvedValue(
          thirtyOneDaysAgo,
        );

        const result = await service.updateUsername('user-123', {
          username: 'newuser',
        });
        expect(result.success).toBe(true);
      });

      it('should show remaining days in error message', async () => {
        const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
        mockUsersRepository.findLastUsernameUpdateByUserId.mockResolvedValue(
          twentyDaysAgo,
        );

        try {
          await service.updateUsername('user-123', { username: 'newuser' });
          fail('Should have thrown');
        } catch (error) {
          expect((error as Error).message).toInclude('10');
        }
      });
    });

    describe('Username availability', () => {
      it('should reject already taken username', async () => {
        mockUsersRepository.isUsernameTaken.mockResolvedValue(true);

        await expect(
          service.updateUsername('user-123', { username: 'takenuser' }),
        ).rejects.toThrow(ConflictException);
      });

      it('should accept available username', async () => {
        mockUsersRepository.isUsernameTaken.mockResolvedValue(false);

        const result = await service.updateUsername('user-123', {
          username: 'availableuser',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('Successful update', () => {
      it('should call repository with correct parameters', async () => {
        await service.updateUsername('user-123', { username: 'newuser' });

        expect(mockUsersRepository.updateUsername).toHaveBeenCalledWith(
          'user-123',
          'newuser',
        );
      });

      it('should return updated username', async () => {
        mockUsersRepository.updateUsername.mockResolvedValue({
          ...mockUser,
          username: 'newuser',
        });

        const result = await service.updateUsername('user-123', {
          username: 'newuser',
        });

        expect(result.username).toBe('newuser');
        expect(result.message).toBe('Username updated successfully');
      });
    });
  });

  describe('checkUsernameAvailability', () => {
    it('should return available=true when not taken', async () => {
      mockUsersRepository.isUsernameTaken.mockResolvedValue(false);

      const result = await service.checkUsernameAvailability('newuser');

      expect(result.available).toBe(true);
      expect(result.username).toBe('newuser');
    });

    it('should return available=false when taken', async () => {
      mockUsersRepository.isUsernameTaken.mockResolvedValue(true);

      const result = await service.checkUsernameAvailability('takenuser');

      expect(result.available).toBe(false);
    });

    it('should normalize username to lowercase', async () => {
      await service.checkUsernameAvailability('TestUser');

      expect(mockUsersRepository.isUsernameTaken).toHaveBeenCalledWith(
        'testuser',
        undefined,
      );
    });
  });
});
