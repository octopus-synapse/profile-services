/**
 * AuthService Tests (Facade)
 *
 * NOTA (Uncle Bob): AuthService é um facade puro - apenas delega para serviços especializados.
 * Estes testes verificam COMPORTAMENTO (outputs), não IMPLEMENTAÇÃO (chamadas internas).
 *
 * Testes detalhados de regras de negócio estão nos serviços especializados:
 * - auth-core.service.spec.ts (signup, login, validateUser)
 * - token-refresh.service.spec.ts (refreshToken, getCurrentUser)
 * - email-verification.service.spec.ts (requestVerification, verifyEmail)
 * - password-reset.service.spec.ts (forgotPassword, resetPassword, changePassword)
 * - account-management.service.spec.ts (changeEmail, deleteAccount)
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import {
  AuthCoreService,
  TokenRefreshService,
  EmailVerificationService,
  PasswordResetService,
  AccountManagementService,
} from './services';

describe('AuthService (Facade)', () => {
  let service: AuthService;

  // Stubs com retornos fixos (não mocks para verificar chamadas)
  const stubAuthCoreService = {
    signup: mock().mockResolvedValue({
      success: true,
      token: 'jwt-token',
      user: { id: 'user-123', email: 'test@example.com' },
    }),
    validateUser: mock().mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }),
    login: mock().mockResolvedValue({
      success: true,
      token: 'jwt-token',
      user: { id: 'user-123', email: 'test@example.com' },
    }),
  };

  const stubTokenRefreshService = {
    refreshToken: mock().mockResolvedValue({
      success: true,
      token: 'new-jwt-token',
    }),
    refreshWithToken: mock().mockResolvedValue({
      success: true,
      token: 'new-jwt-token',
    }),
    getCurrentUser: mock().mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
    }),
  };

  const stubEmailVerificationService = {
    requestVerification: mock().mockResolvedValue({ success: true }),
    verifyEmail: mock().mockResolvedValue({ success: true }),
  };

  const stubPasswordResetService = {
    forgotPassword: mock().mockResolvedValue({ success: true }),
    resetPassword: mock().mockResolvedValue({ success: true }),
    changePassword: mock().mockResolvedValue({ success: true }),
  };

  const stubAccountManagementService = {
    changeEmail: mock().mockResolvedValue({ success: true }),
    deleteAccount: mock().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthCoreService, useValue: stubAuthCoreService },
        { provide: TokenRefreshService, useValue: stubTokenRefreshService },
        {
          provide: EmailVerificationService,
          useValue: stubEmailVerificationService,
        },
        { provide: PasswordResetService, useValue: stubPasswordResetService },
        {
          provide: AccountManagementService,
          useValue: stubAccountManagementService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ==================== Core Authentication ====================

  describe('signup', () => {
    it('should return auth response with token and user on successful signup', async () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      };

      const result = await service.signup(signupDto);

      expect(result).toMatchObject({
        success: true,
        token: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(String),
          email: signupDto.email,
        }),
      });
    });
  });

  describe('login', () => {
    it('should return auth response with token on successful login', async () => {
      const loginDto = { email: 'test@example.com', password: 'Password123!' };

      const result = await service.login(loginDto);

      expect(result).toMatchObject({
        success: true,
        token: expect.any(String),
        user: expect.objectContaining({
          email: loginDto.email,
        }),
      });
    });
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      const result = await service.validateUser(
        'test@example.com',
        'Password123!',
      );

      expect(result).toMatchObject({
        id: expect.any(String),
        email: 'test@example.com',
      });
      expect(result).not.toHaveProperty('password');
    });
  });

  // ==================== Token Refresh ====================

  describe('refreshToken', () => {
    it('should return new token on successful refresh', async () => {
      const result = await service.refreshToken('user-123');

      expect(result).toMatchObject({
        success: true,
        token: expect.any(String),
      });
    });
  });

  describe('refreshTokenWithToken', () => {
    it('should return new token when given valid refresh token', async () => {
      const result = await service.refreshTokenWithToken('valid-refresh-token');

      expect(result).toMatchObject({
        success: true,
        token: expect.any(String),
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user data', async () => {
      const result = await service.getCurrentUser('user-123');

      expect(result).toMatchObject({
        id: expect.any(String),
        email: expect.any(String),
      });
    });
  });

  // ==================== Email Verification ====================

  describe('requestEmailVerification', () => {
    it('should return success when verification email is sent', async () => {
      const dto = { email: 'test@example.com' };

      const result = await service.requestEmailVerification(dto);

      expect(result).toMatchObject({ success: true });
    });
  });

  describe('verifyEmail', () => {
    it('should return success when email is verified', async () => {
      const dto = { token: 'verification-token' };

      const result = await service.verifyEmail(dto);

      expect(result).toMatchObject({ success: true });
    });
  });

  // ==================== Password Operations ====================

  describe('forgotPassword', () => {
    it('should return success when reset email is sent', async () => {
      const dto = { email: 'test@example.com' };

      const result = await service.forgotPassword(dto);

      expect(result).toMatchObject({ success: true });
    });
  });

  describe('resetPassword', () => {
    it('should return success when password is reset', async () => {
      const dto = { token: 'reset-token', password: 'NewPassword123!' };

      const result = await service.resetPassword(dto);

      expect(result).toMatchObject({ success: true });
    });
  });

  describe('changePassword', () => {
    it('should return success when password is changed', async () => {
      const dto = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };

      const result = await service.changePassword('user-123', dto);

      expect(result).toMatchObject({ success: true });
    });
  });

  // ==================== Account Management ====================

  describe('changeEmail', () => {
    it('should return success when email is changed', async () => {
      const dto = {
        newEmail: 'new@example.com',
        currentPassword: 'Password123!',
      };

      const result = await service.changeEmail('user-123', dto);

      expect(result).toMatchObject({ success: true });
    });
  });

  describe('deleteAccount', () => {
    it('should return success when account is deleted', async () => {
      const dto = { password: 'Password123!' };

      const result = await service.deleteAccount('user-123', dto);

      expect(result).toMatchObject({ success: true });
    });
  });
});
