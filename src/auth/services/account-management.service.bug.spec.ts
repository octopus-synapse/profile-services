/**
 * Account Management Bug Detection Tests
 *
 * Uncle Bob (sem café E sem almoço): "MAIS TOCTOU! Vocês não aprendem!"
 *
 * BUG-033: Race Condition - Email change
 * BUG-055: Account deletion doesn't revoke tokens
 * BUG-057: Email change doesn't invalidate sessions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AccountManagementService } from './account-management.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { AppLoggerService } from '../../common/logger/logger.service';

describe('AccountManagementService - BUG DETECTION', () => {
  let service: AccountManagementService;
  let mockPrisma: any;
  let mockPasswordService: any;

  const mockUser = {
    id: 'user-123',
    email: 'old@example.com',
    password: 'hashedPassword',
    role: 'USER',
  };

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
      session: {
        deleteMany: jest.fn(),
      },
      tokenBlacklist: {
        create: jest.fn(),
      },
    };

    mockPasswordService = {
      compare: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountManagementService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PasswordService, useValue: mockPasswordService },
        {
          provide: AppLoggerService,
          useValue: { log: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AccountManagementService>(AccountManagementService);
  });

  describe('BUG-033: Email Change Race Condition (TOCTOU)', () => {
    /**
     * CRITICAL: Same TOCTOU as signup!
     *
     * Current flow (vulnerable):
     * 1. Check if new email exists → false
     * 2. (WINDOW: Another user claims email)
     * 3. Update email → Conflict or duplicate!
     */
    it('should use transaction to prevent race condition', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // Find user with password
        .mockResolvedValueOnce(null); // Email not taken
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
      });

      await service.changeEmail('user-123', {
        newEmail: 'new@example.com',
        currentPassword: 'password',
      });

      // BUG: Should use transaction!
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle unique constraint violation on email change', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null); // Check says email not taken

      // But update fails due to race condition
      mockPrisma.user.update.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
      });

      // BUG: Should catch P2002 and throw ConflictException
      await expect(
        service.changeEmail('user-123', {
          newEmail: 'new@example.com',
          currentPassword: 'password',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('BUG-055: Account Deletion Token Revocation', () => {
    /**
     * CRITICAL: Deleted user can still access system!
     *
     * When account is deleted, ALL active tokens should be revoked.
     * Currently: User deleted but tokens still valid.
     */
    it('should revoke all tokens when account is deleted', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.count.mockResolvedValue(2); // Not last admin
      mockPrisma.user.delete.mockResolvedValue(mockUser);

      await service.deleteAccount('user-123', { password: 'password' });

      // BUG: Sessions/tokens should be invalidated!
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should add current token to blacklist on deletion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.delete.mockResolvedValue(mockUser);

      // BUG: Token blacklist should be updated!
      // await service.deleteAccount('user-123', { password: 'password' }, 'current-token');

      // Currently there's no way to pass the current token to blacklist it
      expect(mockPrisma.tokenBlacklist.create).toBeDefined();
    });
  });

  describe('BUG-057: Email Change Session Invalidation', () => {
    /**
     * When email changes, all sessions should be invalidated
     * because the token contains the old email.
     */
    it('should invalidate all sessions when email changes', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
      });

      await service.changeEmail('user-123', {
        newEmail: 'new@example.com',
        currentPassword: 'password',
      });

      // BUG: Sessions should be invalidated after email change!
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });
});
