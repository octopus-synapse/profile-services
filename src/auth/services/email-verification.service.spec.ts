import { Test, TestingModule } from '@nestjs/testing';
import { EmailVerificationService } from './email-verification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { EmailService } from '../../common/email/email.service';
import { VerificationTokenService } from './verification-token.service';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let prismaService: jest.Mocked<PrismaService>;
  let logger: jest.Mocked<AppLoggerService>;
  let emailService: jest.Mocked<EmailService>;
  let tokenService: jest.Mocked<VerificationTokenService>;

  beforeEach(async () => {
    const mockFindUnique = jest.fn();
    const mockUpdate = jest.fn();

    prismaService = {
      user: {
        findUnique: mockFindUnique,
        update: mockUpdate,
      },
    } as any;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    emailService = {
      sendVerificationEmail: jest.fn(),
      sendWelcomeEmail: jest.fn(),
    } as any;

    tokenService = {
      createEmailVerificationToken: jest.fn(),
      validateEmailVerificationToken: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AppLoggerService, useValue: logger },
        { provide: EmailService, useValue: emailService },
        { provide: VerificationTokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
  });

  describe('requestVerification', () => {
    it('should create token and send email when user exists and is not verified', async () => {
      const dto = { email: 'user@example.com' };
      const mockUser = {
        id: 'user-123',
        email: dto.email,
        name: 'John Doe',
        emailVerified: null,
      };
      const mockToken = 'verification-token-123';

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);
      tokenService.createEmailVerificationToken.mockResolvedValue(mockToken);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.requestVerification(dto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Verification email sent');
      expect(tokenService.createEmailVerificationToken).toHaveBeenCalledWith(dto.email);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        dto.email,
        mockUser.name,
        mockToken,
      );
      expect(logger.log).toHaveBeenCalled();
    });

    it('should return success without sending email when user does not exist', async () => {
      const dto = { email: 'nonexistent@example.com' };

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(null);

      const result = await service.requestVerification(dto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('If the email exists');
      expect(tokenService.createEmailVerificationToken).not.toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should return success when email is already verified', async () => {
      const dto = { email: 'verified@example.com' };
      const mockUser = {
        id: 'user-123',
        email: dto.email,
        name: 'Jane Doe',
        emailVerified: new Date('2024-01-01'),
      };

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);

      const result = await service.requestVerification(dto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('already verified');
      expect(tokenService.createEmailVerificationToken).not.toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should handle email send failure gracefully', async () => {
      const dto = { email: 'user@example.com' };
      const mockUser = {
        id: 'user-123',
        email: dto.email,
        name: 'John Doe',
        emailVerified: null,
      };
      const mockToken = 'verification-token-123';

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);
      tokenService.createEmailVerificationToken.mockResolvedValue(mockToken);
      emailService.sendVerificationEmail.mockRejectedValue(new Error('SMTP error'));

      // Should not throw despite email failure
      await expect(service.requestVerification(dto)).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send verification email',
        expect.any(String),
        'EmailVerification',
      );
    });

    it('should include token in non-production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const dto = { email: 'user@example.com' };
      const mockUser = {
        id: 'user-123',
        email: dto.email,
        name: 'John Doe',
        emailVerified: null,
      };
      const mockToken = 'verification-token-123';

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);
      tokenService.createEmailVerificationToken.mockResolvedValue(mockToken);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.requestVerification(dto);

      expect(result).toHaveProperty('token', mockToken);

      process.env.NODE_ENV = originalEnv;
    });

    it('should use default name when user name is null', async () => {
      const dto = { email: 'user@example.com' };
      const mockUser = {
        id: 'user-123',
        email: dto.email,
        name: null,
        emailVerified: null,
      };
      const mockToken = 'verification-token-123';

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);
      tokenService.createEmailVerificationToken.mockResolvedValue(mockToken);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.requestVerification(dto);

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        dto.email,
        'Usuário',
        mockToken,
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and send welcome email successfully', async () => {
      const dto = { token: 'valid-token' };
      const email = 'user@example.com';
      const mockUser = {
        id: 'user-123',
        email,
        name: 'John Doe',
        emailVerified: null,
      };

      tokenService.validateEmailVerificationToken.mockResolvedValue(email);
      const mockUpdate = prismaService.user.update as jest.Mock;
      mockUpdate.mockResolvedValue({ ...mockUser, emailVerified: new Date() });
      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);
      emailService.sendWelcomeEmail.mockResolvedValue(undefined);

      const result = await service.verifyEmail(dto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('verified successfully');
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { email },
        data: { emailVerified: expect.any(Date) },
      });
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(email, mockUser.name);
      expect(logger.log).toHaveBeenCalled();
    });

    it('should handle welcome email send failure gracefully', async () => {
      const dto = { token: 'valid-token' };
      const email = 'user@example.com';
      const mockUser = {
        id: 'user-123',
        email,
        name: 'Jane Doe',
        emailVerified: null,
      };

      tokenService.validateEmailVerificationToken.mockResolvedValue(email);
      const mockUpdate = prismaService.user.update as jest.Mock;
      mockUpdate.mockResolvedValue({ ...mockUser, emailVerified: new Date() });
      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);
      emailService.sendWelcomeEmail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.verifyEmail(dto);

      expect(result.success).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send welcome email',
        expect.any(String),
        'EmailVerification',
      );
    });

    it('should handle missing user during welcome email gracefully', async () => {
      const dto = { token: 'valid-token' };
      const email = 'user@example.com';

      tokenService.validateEmailVerificationToken.mockResolvedValue(email);
      const mockUpdate = prismaService.user.update as jest.Mock;
      mockUpdate.mockResolvedValue({});
      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(null);

      const result = await service.verifyEmail(dto);

      expect(result.success).toBe(true);
      expect(emailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });

    it('should use default name for welcome email when user name is null', async () => {
      const dto = { token: 'valid-token' };
      const email = 'user@example.com';
      const mockUser = {
        id: 'user-123',
        email,
        name: null,
        emailVerified: null,
      };

      tokenService.validateEmailVerificationToken.mockResolvedValue(email);
      const mockUpdate = prismaService.user.update as jest.Mock;
      mockUpdate.mockResolvedValue({ ...mockUser, emailVerified: new Date() });
      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);
      emailService.sendWelcomeEmail.mockResolvedValue(undefined);

      await service.verifyEmail(dto);

      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(email, 'Usuário');
    });
  });
});
