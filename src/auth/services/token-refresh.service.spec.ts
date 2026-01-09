/**
 * Token Refresh Service Tests
 * Focus: Token refresh flow and revocation checks
 *
 * Key scenarios:
 * - User not found
 * - Token generation
 * - BUG-023/055/056/057: Revoked token detection
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { TokenRefreshService } from './token-refresh.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { TokenService } from './token.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { UserRole } from '@prisma/client';

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let fakePrisma: {
    user: {
      findUnique: ReturnType<typeof mock>;
    };
  };
  let fakeTokenService: {
    generateToken: ReturnType<typeof mock>;
    generateRefreshToken: ReturnType<typeof mock>;
    verifyToken: ReturnType<typeof mock>;
  };
  let fakeTokenBlacklist: {
    isTokenRevokedForUser: ReturnType<typeof mock>;
  };
  let fakeLogger: {
    log: ReturnType<typeof mock>;
    warn: ReturnType<typeof mock>;
    debug: ReturnType<typeof mock>;
  };

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    role: UserRole.USER,
    image: null,
    hasCompletedOnboarding: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    fakePrisma = {
      user: {
        findUnique: mock(() => null),
      },
    };

    fakeTokenService = {
      generateToken: mock(() => 'access-token-123'),
      generateRefreshToken: mock(() => 'refresh-token-123'),
      verifyToken: mock(() => ({ sub: 'user-123', email: 'test@example.com' })),
    };

    fakeTokenBlacklist = {
      isTokenRevokedForUser: mock(() => Promise.resolve(false)),
    };

    fakeLogger = {
      log: mock(() => {}),
      warn: mock(() => {}),
      debug: mock(() => {}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenRefreshService,
        { provide: PrismaService, useValue: fakePrisma },
        { provide: AppLoggerService, useValue: fakeLogger },
        { provide: TokenService, useValue: fakeTokenService },
        { provide: TokenBlacklistService, useValue: fakeTokenBlacklist },
      ],
    }).compile();

    service = module.get<TokenRefreshService>(TokenRefreshService);
  });

  describe('refreshToken', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      fakePrisma.user.findUnique.mockReturnValue(null);

      await expect(service.refreshToken('user-123')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(fakeLogger.warn).toHaveBeenCalled();
    });

    it('should generate new tokens for valid user', async () => {
      fakePrisma.user.findUnique.mockReturnValue(testUser);

      const result = await service.refreshToken('user-123');

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe('access-token-123');
      expect(result.data.refreshToken).toBe('access-token-123'); // same token used
      expect(fakeTokenService.generateToken).toHaveBeenCalled();
    });
  });

  describe('refreshWithToken', () => {
    it('should throw UnauthorizedException for invalid token', async () => {
      fakeTokenService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshWithToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is revoked (BUG-023/055/056/057)', async () => {
      fakeTokenService.verifyToken.mockReturnValue({
        sub: 'user-123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000) - 3600, // issued 1 hour ago
      });
      fakeTokenBlacklist.isTokenRevokedForUser.mockResolvedValue(true);

      await expect(service.refreshWithToken('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should generate new tokens for valid non-revoked token', async () => {
      fakeTokenService.verifyToken.mockReturnValue({
        sub: 'user-123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
      });
      fakeTokenBlacklist.isTokenRevokedForUser.mockResolvedValue(false);
      fakePrisma.user.findUnique.mockReturnValue(testUser);

      const result = await service.refreshWithToken('valid-token');

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe('access-token-123');
      expect(result.data.refreshToken).toBe('access-token-123'); // same token used
    });
  });

  describe('getCurrentUser', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      fakePrisma.user.findUnique.mockReturnValue(null);

      await expect(service.getCurrentUser('user-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user data on success', async () => {
      fakePrisma.user.findUnique.mockReturnValue(testUser);

      const result = await service.getCurrentUser('user-123');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('user-123');
      expect(result.data.email).toBe('test@example.com');
    });
  });
});
