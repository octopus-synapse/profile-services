/**
 * Password Reset Service Tests
 * Focus: Behavior, not infrastructure
 *
 * Key scenarios:
 * - Anti-enumeration (always success, don't reveal if user exists)
 * - Token creation and email sending
 * - Password hash and update
 * - BUG-056: Token revocation after password change
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { PasswordService } from './password.service';
import { VerificationTokenService } from './verification-token.service';
import { TokenBlacklistService } from './token-blacklist.service';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let fakePrisma: {
    user: {
      findUnique: ReturnType<typeof mock>;
      update: ReturnType<typeof mock>;
    };
  };
  let fakeEmailService: {
    sendPasswordResetEmail: ReturnType<typeof mock>;
    sendPasswordChangedEmail: ReturnType<typeof mock>;
  };
  let fakePasswordService: {
    hash: ReturnType<typeof mock>;
    compare: ReturnType<typeof mock>;
  };
  let fakeTokenService: {
    createPasswordResetToken: ReturnType<typeof mock>;
    validatePasswordResetToken: ReturnType<typeof mock>;
  };
  let fakeTokenBlacklist: {
    revokeAllUserTokens: ReturnType<typeof mock>;
  };
  let fakeLogger: {
    log: ReturnType<typeof mock>;
    error: ReturnType<typeof mock>;
    warn: ReturnType<typeof mock>;
  };

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
  };

  beforeEach(async () => {
    fakePrisma = {
      user: {
        findUnique: mock(() => null),
        update: mock(() => ({})),
      },
    };

    fakeEmailService = {
      sendPasswordResetEmail: mock(() => Promise.resolve()),
      sendPasswordChangedEmail: mock(() => Promise.resolve()),
    };

    fakePasswordService = {
      hash: mock(() => Promise.resolve('new-hashed-password')),
      compare: mock(() => Promise.resolve(true)),
    };

    fakeTokenService = {
      createPasswordResetToken: mock(() => Promise.resolve('reset-token-123')),
      validatePasswordResetToken: mock(() =>
        Promise.resolve('test@example.com'),
      ),
    };

    fakeTokenBlacklist = {
      revokeAllUserTokens: mock(() => Promise.resolve()),
    };

    fakeLogger = {
      log: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PrismaService, useValue: fakePrisma },
        { provide: AppLoggerService, useValue: fakeLogger },
        { provide: EmailService, useValue: fakeEmailService },
        { provide: PasswordService, useValue: fakePasswordService },
        { provide: VerificationTokenService, useValue: fakeTokenService },
        { provide: TokenBlacklistService, useValue: fakeTokenBlacklist },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
  });

  describe('forgotPassword', () => {
    it('should return success with emailSent:false when user does not exist (anti-enumeration)', async () => {
      fakePrisma.user.findUnique.mockReturnValue(null);

      const result = await service.forgotPassword({
        email: 'unknown@test.com',
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
      expect(fakeEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(fakeTokenService.createPasswordResetToken).not.toHaveBeenCalled();
    });

    it('should create token and send email when user exists', async () => {
      fakePrisma.user.findUnique.mockReturnValue(testUser);

      const result = await service.forgotPassword({ email: testUser.email });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(true);
      expect(fakeTokenService.createPasswordResetToken).toHaveBeenCalledWith(
        testUser.email,
      );
      expect(fakeEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        testUser.email,
        testUser.name,
        'reset-token-123',
      );
    });

    it('should return success with emailSent:false when email fails (does not throw)', async () => {
      fakePrisma.user.findUnique.mockReturnValue(testUser);
      fakeEmailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('SMTP error'),
      );

      const result = await service.forgotPassword({ email: testUser.email });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
      expect(fakeLogger.error).toHaveBeenCalled();
    });

    it('should include token in response for non-production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      fakePrisma.user.findUnique.mockReturnValue(testUser);

      const result = await service.forgotPassword({ email: testUser.email });

      expect(result.token).toBe('reset-token-123');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('resetPassword', () => {
    it('should validate token, hash password, and update user', async () => {
      const result = await service.resetPassword({
        token: 'valid-token',
        password: 'NewPassword123!',
      });

      expect(result.success).toBe(true);
      expect(fakeTokenService.validatePasswordResetToken).toHaveBeenCalledWith(
        'valid-token',
      );
      expect(fakePasswordService.hash).toHaveBeenCalledWith('NewPassword123!');
      expect(fakePrisma.user.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: { password: 'new-hashed-password' },
      });
    });
  });

  describe('changePassword', () => {
    it('should throw NotFoundException when user not found', async () => {
      fakePrisma.user.findUnique.mockReturnValue(null);

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user has no password', async () => {
      fakePrisma.user.findUnique.mockReturnValue({
        ...testUser,
        password: null,
      });

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      fakePrisma.user.findUnique.mockReturnValue(testUser);
      fakePasswordService.compare.mockResolvedValue(false);

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'wrong',
          newPassword: 'new',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should update password and revoke all tokens on success (BUG-056)', async () => {
      fakePrisma.user.findUnique.mockReturnValue(testUser);
      fakePasswordService.compare.mockResolvedValue(true);

      const result = await service.changePassword('user-123', {
        currentPassword: 'correct',
        newPassword: 'NewPassword123!',
      });

      expect(result.success).toBe(true);
      expect(fakePasswordService.hash).toHaveBeenCalledWith('NewPassword123!');
      expect(fakePrisma.user.update).toHaveBeenCalled();
      expect(fakeTokenBlacklist.revokeAllUserTokens).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should send password changed email but not throw if email fails', async () => {
      fakePrisma.user.findUnique.mockReturnValue(testUser);
      fakePasswordService.compare.mockResolvedValue(true);
      fakeEmailService.sendPasswordChangedEmail.mockRejectedValue(
        new Error('SMTP error'),
      );

      const result = await service.changePassword('user-123', {
        currentPassword: 'correct',
        newPassword: 'NewPassword123!',
      });

      expect(result.success).toBe(true);
      expect(fakeLogger.error).toHaveBeenCalled();
    });
  });
});
