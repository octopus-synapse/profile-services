import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger/logger.service';
import {
  TokenService,
  PasswordService,
  EmailVerificationService,
  PasswordResetService,
  AccountManagementService,
} from './services';

/**
 * AuthService Unit Tests
 *
 * These tests focus on the core authentication methods (signup, login, refreshToken)
 * Delegated operations are tested in their respective service test files:
 * - token.service.spec.ts
 * - password.service.spec.ts
 * - email-verification.service.spec.ts (if exists)
 * - password-reset.service.spec.ts (if exists)
 * - account-management.service.spec.ts (if exists)
 */
describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockTokenService = {
    generateToken: jest.fn().mockReturnValue('mock-jwt-token'),
    verifyToken: jest.fn(),
  };

  const mockPasswordService = {
    hash: jest.fn().mockResolvedValue('hashedPassword123'),
    compare: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const mockEmailVerificationService = {
    requestVerification: jest.fn(),
    verifyEmail: jest.fn(),
  };

  const mockPasswordResetService = {
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockAccountManagementService = {
    changeEmail: jest.fn(),
    deleteAccount: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AppLoggerService, useValue: mockLoggerService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: PasswordService, useValue: mockPasswordService },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
        { provide: PasswordResetService, useValue: mockPasswordResetService },
        {
          provide: AccountManagementService,
          useValue: mockAccountManagementService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signup', () => {
    const signupDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: signupDto.email,
        name: signupDto.name,
        hasCompletedOnboarding: false,
        role: 'USER',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.signup(signupDto);

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.email).toBe(signupDto.email);
      expect(mockPasswordService.hash).toHaveBeenCalledWith(signupDto.password);
      expect(mockTokenService.generateToken).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
      });

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        name: 'Test User',
        password: 'hashedPassword',
        hasCompletedOnboarding: true,
        role: 'USER',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        password: 'hashedPassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token for valid user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        hasCompletedOnboarding: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.refreshToken('user-123');

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
      expect(mockTokenService.generateToken).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('delegated operations', () => {
    it('should delegate requestEmailVerification to EmailVerificationService', async () => {
      const dto = { email: 'test@example.com' };
      mockEmailVerificationService.requestVerification.mockResolvedValue({
        success: true,
      });

      await service.requestEmailVerification(dto);

      expect(
        mockEmailVerificationService.requestVerification,
      ).toHaveBeenCalledWith(dto);
    });

    it('should delegate forgotPassword to PasswordResetService', async () => {
      const dto = { email: 'test@example.com' };
      mockPasswordResetService.forgotPassword.mockResolvedValue({
        success: true,
      });

      await service.forgotPassword(dto);

      expect(mockPasswordResetService.forgotPassword).toHaveBeenCalledWith(dto);
    });

    it('should delegate changeEmail to AccountManagementService', async () => {
      const dto = { newEmail: 'new@example.com', currentPassword: 'password' };
      mockAccountManagementService.changeEmail.mockResolvedValue({
        success: true,
      });

      await service.changeEmail('user-123', dto);

      expect(mockAccountManagementService.changeEmail).toHaveBeenCalledWith(
        'user-123',
        dto,
      );
    });
  });
});
