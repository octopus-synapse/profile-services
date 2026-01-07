import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
/**
 * LocalStrategy Tests
 *
 * NOTA (Uncle Bob): Strategy é "framework glue", mas a lógica de validação
 * (verificar credenciais) é comportamento de negócio e deve ser testada.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: { validateUser: jest.Mock };

  const mockValidatedUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    hasCompletedOnboarding: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    username: null,
    image: null,
  };

  beforeEach(async () => {
    authService = {
      validateUser: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
  });

  describe('validate', () => {
    it('should return user when credentials are valid', async () => {
      authService.validateUser.mockResolvedValue(mockValidatedUser);

      const result = await strategy.validate(
        'test@example.com',
        'correct-password',
      );

      expect(result).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      });
      // Should not have password in result
      expect(result).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('test@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('nonexistent@example.com', 'any-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should pass email and password to authService.validateUser', async () => {
      authService.validateUser.mockResolvedValue(mockValidatedUser);

      await strategy.validate('user@test.com', 'secret123');

      expect(authService.validateUser).toHaveBeenCalledWith(
        'user@test.com',
        'secret123',
      );
    });
  });
});
