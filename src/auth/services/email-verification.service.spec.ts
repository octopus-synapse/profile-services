/**
 * Email Verification Service Tests
 * Focus: Behavior, not infrastructure
 *
 * Key scenarios:
 * - Anti-enumeration (always success, don't reveal if user exists)
 * - Already verified path
 * - Token creation and email sending
 * - Email failures are logged but don't throw
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailVerificationService } from './email-verification.service';
import { AuthUserRepository } from '../repositories';
import { AppLoggerService } from '../../common/logger/logger.service';
import { EmailService } from '../../common/email/email.service';
import { VerificationTokenService } from './verification-token.service';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let userRepo: {
    findByEmailForVerification: ReturnType<typeof mock>;
    markEmailVerifiedByEmail: ReturnType<typeof mock>;
  };
  let fakeEmailService: {
    sendVerificationEmail: ReturnType<typeof mock>;
    sendWelcomeEmail: ReturnType<typeof mock>;
  };
  let fakeTokenService: {
    createEmailVerificationToken: ReturnType<typeof mock>;
    validateEmailVerificationToken: ReturnType<typeof mock>;
  };
  let fakeLogger: {
    log: ReturnType<typeof mock>;
    error: ReturnType<typeof mock>;
  };

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: null,
  };

  const verifiedUser = {
    ...testUser,
    emailVerified: new Date(),
  };

  beforeEach(async () => {
    userRepo = {
      findByEmailForVerification: mock(() => null),
      markEmailVerifiedByEmail: mock(() => Promise.resolve()),
    };

    fakeEmailService = {
      sendVerificationEmail: mock(() => Promise.resolve()),
      sendWelcomeEmail: mock(() => Promise.resolve()),
    };

    fakeTokenService = {
      createEmailVerificationToken: mock(() =>
        Promise.resolve('verification-token-123'),
      ),
      validateEmailVerificationToken: mock(() =>
        Promise.resolve('test@example.com'),
      ),
    };

    fakeLogger = {
      log: mock(() => {}),
      error: mock(() => {}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: AuthUserRepository, useValue: userRepo },
        { provide: AppLoggerService, useValue: fakeLogger },
        { provide: EmailService, useValue: fakeEmailService },
        { provide: VerificationTokenService, useValue: fakeTokenService },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
  });

  describe('requestVerification', () => {
    it('should return success when user does not exist (anti-enumeration)', async () => {
      userRepo.findByEmailForVerification.mockReturnValue(null);

      const result = await service.requestVerification({
        email: 'unknown@test.com',
      });

      expect(result.success).toBe(true);
      expect(
        fakeTokenService.createEmailVerificationToken,
      ).not.toHaveBeenCalled();
      expect(fakeEmailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should return success when email is already verified', async () => {
      userRepo.findByEmailForVerification.mockReturnValue(verifiedUser);

      const result = await service.requestVerification({
        email: verifiedUser.email,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('already verified');
      expect(
        fakeTokenService.createEmailVerificationToken,
      ).not.toHaveBeenCalled();
    });

    it('should create token and send email for unverified user', async () => {
      userRepo.findByEmailForVerification.mockReturnValue(testUser);

      const result = await service.requestVerification({
        email: testUser.email,
      });

      expect(result.success).toBe(true);
      expect(
        fakeTokenService.createEmailVerificationToken,
      ).toHaveBeenCalledWith(testUser.email);
      expect(fakeEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        testUser.email,
        testUser.name,
        'verification-token-123',
      );
    });

    it('should include token in response for non-production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      userRepo.findByEmailForVerification.mockReturnValue(testUser);

      const result = await service.requestVerification({
        email: testUser.email,
      });

      expect(result.token).toBe('verification-token-123');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not throw when email sending fails (logs error)', async () => {
      userRepo.findByEmailForVerification.mockReturnValue(testUser);
      fakeEmailService.sendVerificationEmail.mockRejectedValue(
        new Error('SMTP error'),
      );

      // Should not throw
      const result = await service.requestVerification({
        email: testUser.email,
      });

      expect(result.success).toBe(true);
      expect(fakeLogger.error).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should validate token and mark email as verified', async () => {
      userRepo.findByEmailForVerification.mockReturnValue(testUser);

      const result = await service.verifyEmail({ token: 'valid-token' });

      expect(result.success).toBe(true);
      expect(
        fakeTokenService.validateEmailVerificationToken,
      ).toHaveBeenCalledWith('valid-token');
      expect(userRepo.markEmailVerifiedByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should send welcome email after verification', async () => {
      userRepo.findByEmailForVerification.mockReturnValue(testUser);

      await service.verifyEmail({ token: 'valid-token' });

      expect(fakeEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        testUser.email,
        testUser.name,
      );
    });

    it('should not throw when welcome email fails (logs error)', async () => {
      userRepo.findByEmailForVerification.mockReturnValue(testUser);
      fakeEmailService.sendWelcomeEmail.mockRejectedValue(
        new Error('SMTP error'),
      );

      // Should not throw
      const result = await service.verifyEmail({ token: 'valid-token' });

      expect(result.success).toBe(true);
      expect(fakeLogger.error).toHaveBeenCalled();
    });
  });
});
