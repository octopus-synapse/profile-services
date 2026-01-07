import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountManagementService } from './account-management.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { PasswordService } from './password.service';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ERROR_MESSAGES } from '../../common/constants/config';

describe('AccountManagementService', () => {
  let service: AccountManagementService;
  let prismaService: PrismaService;
  let logger: AppLoggerService;
  let passwordService: PasswordService;

  beforeEach(async () => {
    const mockFindUnique = mock();
    const mockUpdate = mock();
    const mockDelete = mock();
    const mockCount = mock();

    prismaService = {
      user: {
        findUnique: mockFindUnique,
        update: mockUpdate,
        delete: mockDelete,
        count: mockCount,
      },
    } as any;

    logger = {
      log: mock(),
      debug: mock(),
      error: mock(),
      warn: mock(),
    } as any;

    passwordService = {
      compare: mock(),
      hash: mock(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountManagementService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AppLoggerService, useValue: logger },
        { provide: PasswordService, useValue: passwordService },
      ],
    }).compile();

    service = module.get<AccountManagementService>(AccountManagementService);
  });

  describe('changeEmail', () => {
    it('should change email successfully when all validations pass', async () => {
      const userId = 'user-123';
      const dto = {
        newEmail: 'newemail@example.com',
        currentPassword: 'current-password',
      };
      const mockUser = {
        id: userId,
        email: 'old@example.com',
        password: 'hashed-password',
        role: 'USER',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      const mockUpdate = prismaService.user.update as any;

      mockFindUnique.mockResolvedValueOnce(mockUser as any);
      passwordService.compare.mockResolvedValue(true);
      mockFindUnique.mockResolvedValueOnce(null); // Email not taken
      mockUpdate.mockResolvedValue(mockUser as any);

      const result = await service.changeEmail(userId, dto);

      expect(result).toEqual({
        success: true,
        message: 'Email changed successfully. Please verify your new email.',
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          email: 'newemail@example.com',
          emailVerified: null,
        },
      });
      expect(logger.log).toHaveBeenCalledWith(
        'Email changed for user',
        'AccountManagement',
        { userId },
      );
    });

    it('should throw UnauthorizedException when user has no password', async () => {
      const userId = 'user-123';
      const dto = {
        newEmail: 'new@example.com',
        currentPassword: 'password',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      mockFindUnique.mockResolvedValue({
        id: userId,
        email: 'old@example.com',
        password: null,
        role: 'USER',
      } as any);

      await expect(service.changeEmail(userId, dto)).rejects.toThrow(
        new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS),
      );

      expect(passwordService.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const userId = 'user-123';
      const dto = {
        newEmail: 'new@example.com',
        currentPassword: 'wrong-password',
      };
      const mockUser = {
        id: userId,
        email: 'old@example.com',
        password: 'hashed-password',
        role: 'USER',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      const mockUpdate = prismaService.user.update as any;
      mockFindUnique.mockResolvedValue(mockUser as any);
      passwordService.compare.mockResolvedValue(false);

      await expect(service.changeEmail(userId, dto)).rejects.toThrow(
        new UnauthorizedException(ERROR_MESSAGES.PASSWORD_INCORRECT),
      );

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when new email is already taken', async () => {
      const userId = 'user-123';
      const dto = {
        newEmail: 'taken@example.com',
        currentPassword: 'password',
      };
      const mockUser = {
        id: userId,
        email: 'old@example.com',
        password: 'hashed-password',
        role: 'USER',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      const mockUpdate = prismaService.user.update as any;
      mockFindUnique.mockResolvedValueOnce(mockUser as any);
      passwordService.compare.mockResolvedValue(true);
      mockFindUnique.mockResolvedValueOnce({
        id: 'other-user',
      } as any);

      await expect(service.changeEmail(userId, dto)).rejects.toThrow(
        new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_IN_USE),
      );

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should reset emailVerified to null when changing email', async () => {
      const userId = 'user-123';
      const dto = {
        newEmail: 'verified@example.com',
        currentPassword: 'password',
      };
      const mockUser = {
        id: userId,
        email: 'old@example.com',
        password: 'hashed-password',
        role: 'USER',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      const mockUpdate = prismaService.user.update as any;
      mockFindUnique.mockResolvedValueOnce(mockUser as any);
      passwordService.compare.mockResolvedValue(true);
      mockFindUnique.mockResolvedValueOnce(null);
      mockUpdate.mockResolvedValue(mockUser as any);

      await service.changeEmail(userId, dto);

      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailVerified: null,
          }),
        }),
      );
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully for non-admin user', async () => {
      const userId = 'user-123';
      const dto = { password: 'correct-password' };
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        password: 'hashed-password',
        role: 'USER',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      const mockDelete = prismaService.user.delete as any;
      mockFindUnique.mockResolvedValue(mockUser as any);
      passwordService.compare.mockResolvedValue(true);
      mockDelete.mockResolvedValue(mockUser as any);

      const result = await service.deleteAccount(userId, dto);

      expect(result).toEqual({
        success: true,
        message: 'Account deleted successfully',
      });
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(logger.log).toHaveBeenCalledWith(
        'Account deleted',
        'AccountManagement',
        {
          userId,
        },
      );
    });

    it('should delete admin account when there are multiple admins', async () => {
      const userId = 'admin-123';
      const dto = { password: 'admin-password' };
      const mockAdmin = {
        id: userId,
        email: 'admin@example.com',
        password: 'hashed-password',
        role: 'ADMIN',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      const mockCount = prismaService.user.count as any;
      const mockDelete = prismaService.user.delete as any;
      mockFindUnique.mockResolvedValue(mockAdmin as any);
      passwordService.compare.mockResolvedValue(true);
      mockCount.mockResolvedValue(3); // 3 admins
      mockDelete.mockResolvedValue(mockAdmin as any);

      const result = await service.deleteAccount(userId, dto);

      expect(result.success).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should throw BadRequestException when deleting last admin', async () => {
      const userId = 'last-admin';
      const dto = { password: 'admin-password' };
      const mockAdmin = {
        id: userId,
        email: 'admin@example.com',
        password: 'hashed-password',
        role: 'ADMIN',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      const mockCount = prismaService.user.count as any;
      mockFindUnique.mockResolvedValue(mockAdmin as any);
      passwordService.compare.mockResolvedValue(true);
      mockCount.mockResolvedValue(1); // Only 1 admin

      await expect(service.deleteAccount(userId, dto)).rejects.toThrow(
        new BadRequestException(ERROR_MESSAGES.CANNOT_DELETE_LAST_ADMIN),
      );

      const mockDelete = prismaService.user.delete as any;
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user has no password', async () => {
      const userId = 'user-123';
      const dto = { password: 'password' };

      const mockFindUnique = prismaService.user.findUnique as any;
      mockFindUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
        password: null,
        role: 'USER',
      } as any);

      await expect(service.deleteAccount(userId, dto)).rejects.toThrow(
        new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS),
      );

      const mockDelete = prismaService.user.delete as any;
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const userId = 'user-123';
      const dto = { password: 'wrong-password' };
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        password: 'hashed-password',
        role: 'USER',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      mockFindUnique.mockResolvedValue(mockUser as any);
      passwordService.compare.mockResolvedValue(false);

      await expect(service.deleteAccount(userId, dto)).rejects.toThrow(
        new UnauthorizedException(ERROR_MESSAGES.PASSWORD_INCORRECT),
      );

      const mockDelete = prismaService.user.delete as any;
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should not check admin count for non-admin users', async () => {
      const userId = 'user-123';
      const dto = { password: 'password' };
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        password: 'hashed-password',
        role: 'USER',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      const mockDelete = prismaService.user.delete as any;
      const mockCount = prismaService.user.count as any;
      mockFindUnique.mockResolvedValue(mockUser as any);
      passwordService.compare.mockResolvedValue(true);
      mockDelete.mockResolvedValue(mockUser as any);

      await service.deleteAccount(userId, dto);

      expect(mockCount).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle user not found in changeEmail', async () => {
      const userId = 'nonexistent';
      const dto = {
        newEmail: 'new@example.com',
        currentPassword: 'password',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      mockFindUnique.mockResolvedValue(null);

      await expect(service.changeEmail(userId, dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle user not found in deleteAccount', async () => {
      const userId = 'nonexistent';
      const dto = { password: 'password' };

      const mockFindUnique = prismaService.user.findUnique as any;
      mockFindUnique.mockResolvedValue(null);

      await expect(service.deleteAccount(userId, dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
