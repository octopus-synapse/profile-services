import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { PasswordResetService } from './password-reset.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { EmailService } from '../../common/email/email.service';
import { PasswordService } from './password.service';
import { VerificationTokenService } from './verification-token.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../../common/constants/config';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let prismaService: PrismaService;
  let logger: AppLoggerService;
  let emailService: EmailService;
  let passwordService: PasswordService;
  let tokenService: VerificationTokenService;

  beforeEach(async () => {
    const mockFindUnique = mock();
    const mockUpdate = mock();

    prismaService = {
      user: {
        findUnique: mockFindUnique,
        update: mockUpdate,
      },
    } as any;

    logger = {
      log: mock(),
      error: mock(),
      warn: mock(),
      debug: mock(),
    } as any;

    emailService = {
      sendPasswordResetEmail: mock(),
      sendWelcomeEmail: mock(),
    } as any;

    passwordService = {
      hash: mock(),
      compare: mock(),
    } as any;

    tokenService = {
      createPasswordResetToken: mock(),
      validatePasswordResetToken: mock(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AppLoggerService, useValue: logger },
        { provide: EmailService, useValue: emailService },
        { provide: PasswordService, useValue: passwordService },
        { provide: VerificationTokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
  });

  describe('forgotPassword', () => {
    it('should create token and send email when user exists', async () => {
      const dto = { email: 'user@example.com' };
      const mockUser = { id: 'user-123', email: dto.email, name: 'John Doe' };
      const mockToken = 'reset-token-123';

      const mockFindUnique = prismaService.user.findUnique as any;
      mockFindUnique.mockResolvedValue(mockUser);
      tokenService.createPasswordResetToken.mockResolvedValue(mockToken);
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(dto);

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(true);
      expect(tokenService.createPasswordResetToken).toHaveBeenCalledWith(
        dto.email,
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        dto.email,
        mockUser.name,
        mockToken,
      );
      expect(logger.log).toHaveBeenCalled();
    });

    it('should return success without sending email when user does not exist', async () => {
      const dto = { email: 'nonexistent@example.com' };

      const mockFindUnique = prismaService.user.findUnique as any;
      mockFindUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(dto);

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
      expect(result.message).toContain('If the email exists');
      expect(tokenService.createPasswordResetToken).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle email send failure gracefully', async () => {
      const dto = { email: 'user@example.com' };
      const mockUser = { id: 'user-123', email: dto.email, name: 'John Doe' };
      const mockToken = 'reset-token-123';

      const mockFindUnique = prismaService.user.findUnique as any;
      mockFindUnique.mockResolvedValue(mockUser);
      tokenService.createPasswordResetToken.mockResolvedValue(mockToken);
      emailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('SMTP error'),
      );

      const result = await service.forgotPassword(dto);

      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send password reset email',
        expect.any(String),
        'PasswordReset',
        { email: dto.email },
      );
    });

    it('should include token in non-production mode when email sent', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const dto = { email: 'user@example.com' };
      const mockUser = { id: 'user-123', email: dto.email, name: 'John Doe' };
      const mockToken = 'reset-token-123';

      const mockFindUnique = prismaService.user.findUnique as any;
      mockFindUnique.mockResolvedValue(mockUser);
      tokenService.createPasswordResetToken.mockResolvedValue(mockToken);
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(dto);

      expect(result).toHaveProperty('token', mockToken);

      process.env.NODE_ENV = originalEnv;
    });

    it('should include token in non-production mode when email fails', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const dto = { email: 'user@example.com' };
      const mockUser = { id: 'user-123', email: dto.email, name: 'John Doe' };
      const mockToken = 'reset-token-456';

      const mockFindUnique = prismaService.user.findUnique as any;
      mockFindUnique.mockResolvedValue(mockUser);
      tokenService.createPasswordResetToken.mockResolvedValue(mockToken);
      emailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await service.forgotPassword(dto);

      expect(result).toHaveProperty('token', mockToken);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully with valid token', async () => {
      const dto = { token: 'valid-token', password: 'NewSecureP@ss123' };
      const email = 'user@example.com';
      const hashedPassword = 'hashed-new-password';

      tokenService.validatePasswordResetToken.mockResolvedValue(email);
      passwordService.hash.mockResolvedValue(hashedPassword);
      const mockUpdate = prismaService.user.update as any;
      mockUpdate.mockResolvedValue({});

      const result = await service.resetPassword(dto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('reset successfully');
      expect(tokenService.validatePasswordResetToken).toHaveBeenCalledWith(
        dto.token,
      );
      expect(passwordService.hash).toHaveBeenCalledWith(dto.password);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { email },
        data: { password: hashedPassword },
      });
      expect(logger.log).toHaveBeenCalled();
    });

    it('should throw error when token is invalid', async () => {
      const dto = { token: 'invalid-token', password: 'NewPassword123' };

      tokenService.validatePasswordResetToken.mockRejectedValue(
        new UnauthorizedException('Invalid token'),
      );

      await expect(service.resetPassword(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(passwordService.hash).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully when current password is correct', async () => {
      const userId = 'user-123';
      const dto = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewSecureP@ss456',
      };
      const mockUser = {
        id: userId,
        password: 'hashed-old-password',
      };
      const hashedNewPassword = 'hashed-new-password';

      const mockFindUnique = prismaService.user.findUnique as any;
      const mockUpdate = prismaService.user.update as any;
      mockFindUnique.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(true);
      passwordService.hash.mockResolvedValue(hashedNewPassword);
      mockUpdate.mockResolvedValue({});

      const result = await service.changePassword(userId, dto);

      expect(result.success).toBe(true);
      expect(passwordService.compare).toHaveBeenCalledWith(
        dto.currentPassword,
        mockUser.password,
      );
      expect(passwordService.hash).toHaveBeenCalledWith(dto.newPassword);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const userId = 'nonexistent';
      const dto = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      mockFindUnique.mockResolvedValue(null);

      await expect(service.changePassword(userId, dto)).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND),
      );
    });

    it('should throw NotFoundException when user has no password', async () => {
      const userId = 'user-123';
      const dto = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      mockFindUnique.mockResolvedValue({ id: userId, password: null });

      await expect(service.changePassword(userId, dto)).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND),
      );
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      const userId = 'user-123';
      const dto = {
        currentPassword: 'WrongPassword123',
        newPassword: 'NewPassword456',
      };
      const mockUser = {
        id: userId,
        password: 'hashed-old-password',
      };

      const mockFindUnique = prismaService.user.findUnique as any;
      mockFindUnique.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(false);

      await expect(service.changePassword(userId, dto)).rejects.toThrow(
        new UnauthorizedException(ERROR_MESSAGES.CURRENT_PASSWORD_INCORRECT),
      );

      expect(passwordService.hash).not.toHaveBeenCalled();
    });
  });
});
