/**
 * JwtStrategy Tests
 *
 * NOTA (Uncle Bob): Strategy é "framework glue", mas a lógica de validação
 * (verificar se usuário existe) é comportamento de negócio e deve ser testada.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock } };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    hasCompletedOnboarding: true,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret-key';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('should return user payload when user exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'USER',
        hasCompletedOnboarding: true,
      };

      const result = await strategy.validate(payload);

      expect(result).toMatchObject({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        hasCompletedOnboarding: true,
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const payload: JwtPayload = {
        sub: 'non-existent-user',
        email: 'deleted@example.com',
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return correct onboarding status', async () => {
      const notOnboardedUser = {
        ...mockUser,
        hasCompletedOnboarding: false,
      };
      prisma.user.findUnique.mockResolvedValue(notOnboardedUser);

      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };

      const result = await strategy.validate(payload);

      expect(result.hasCompletedOnboarding).toBe(false);
    });

    it('should return admin role when user is admin', async () => {
      const adminUser = {
        ...mockUser,
        role: UserRole.ADMIN,
      };
      prisma.user.findUnique.mockResolvedValue(adminUser);

      const payload: JwtPayload = {
        sub: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      const result = await strategy.validate(payload);

      expect(result.role).toBe(UserRole.ADMIN);
    });
  });

  describe('constructor', () => {
    it('should throw error when JWT_SECRET is not configured', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(null),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            JwtStrategy,
            { provide: PrismaService, useValue: prisma },
            { provide: ConfigService, useValue: mockConfigService },
          ],
        }).compile(),
      ).rejects.toThrow('JWT_SECRET environment variable is required');
    });
  });
});
