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
import {
  UserNotFoundError,
  AuthenticationError,
} from '@octopus-synapse/profile-contracts';
import { PasswordResetService } from './password-reset.service';
import { AuthUserRepository } from '../repositories/auth-user.repository';
import { AppLoggerService } from '../../common/logger/logger.service';
import { EmailService } from '../../common/email/email.service';
import { PasswordService } from './password.service';
import { VerificationTokenService } from './verification-token.service';
import { TokenBlacklistService } from './token-blacklist.service';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let fakeAuthUserRepository: {
    findByEmail: ReturnType<typeof mock>;
    findById: ReturnType<typeof mock>;
    findByIdWithPassword: ReturnType<typeof mock>;
    updatePassword: ReturnType<typeof mock>;
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
    fakeAuthUserRepository = {
      findByEmail: mock(() => null),
      findById: mock(() => null),
      findByIdWithPassword: mock(() => null),
      updatePassword: mock(() => ({})),
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
        { provide: AuthUserRepository, useValue: fakeAuthUserRepository },
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
      fakeAuthUserRepository.findByEmail.mockReturnValue(null);

      const result = await service.forgotPassword({
        email: 'unknown@test.com',
      });

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
      expect(fakeEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(fakeTokenService.createPasswordResetToken).not.toHaveBeenCalled();
    });

    it('should create token and send email when user exists', async () => {
      fakeAuthUserRepository.findByEmail.mockReturnValue(testUser);

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
      fakeAuthUserRepository.findByEmail.mockReturnValue(testUser);
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

      fakeAuthUserRepository.findByEmail.mockReturnValue(testUser);

      const result = await service.forgotPassword({ email: testUser.email });

      expect(result.token).toBe('reset-token-123');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('resetPassword', () => {
    it('should validate token, hash password, and update user', async () => {
      fakeAuthUserRepository.findByEmail.mockReturnValue(testUser);

      const result = await service.resetPassword({
        token: 'valid-token',
        password: 'NewPassword123!',
      });

      expect(result.success).toBe(true);
      expect(fakeTokenService.validatePasswordResetToken).toHaveBeenCalledWith(
        'valid-token',
      );
      expect(fakePasswordService.hash).toHaveBeenCalledWith('NewPassword123!');
      expect(fakeAuthUserRepository.updatePassword).toHaveBeenCalledWith(
        testUser.id,
        'new-hashed-password',
      );
    });
  });

  describe('changePassword', () => {
    it('should throw UserNotFoundError when user not found', async () => {
      fakeAuthUserRepository.findById.mockReturnValue(null);

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should throw UserNotFoundError when user has no password', async () => {
      fakeAuthUserRepository.findById.mockReturnValue({
        ...testUser,
        password: null,
      });

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should throw AuthenticationError when current password is incorrect', async () => {
      fakeAuthUserRepository.findById.mockReturnValue(testUser);
      fakePasswordService.compare.mockResolvedValue(false);

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'wrong',
          newPassword: 'new',
        }),
      ).rejects.toThrow(AuthenticationError);
    });

    it('should update password and revoke all tokens on success (BUG-056)', async () => {
      fakeAuthUserRepository.findById.mockReturnValue(testUser);
      fakePasswordService.compare.mockResolvedValue(true);

      const result = await service.changePassword('user-123', {
        currentPassword: 'correct',
        newPassword: 'NewPassword123!',
      });

      expect(result.success).toBe(true);
      expect(fakePasswordService.hash).toHaveBeenCalledWith('NewPassword123!');
      expect(fakeAuthUserRepository.updatePassword).toHaveBeenCalled();
      expect(fakeTokenBlacklist.revokeAllUserTokens).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should send password changed email but not throw if email fails', async () => {
      fakeAuthUserRepository.findById.mockReturnValue(testUser);
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
