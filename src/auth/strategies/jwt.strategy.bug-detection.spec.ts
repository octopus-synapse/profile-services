import { describe, it, expect, beforeEach, mock } from 'bun:test';
/**
 * JWT Strategy Bug Detection Tests
 *
 * Uncle Bob (sem café): "Um usuário sem email verificado NÃO DEVERIA
 * conseguir usar o sistema! Mas vocês não verificam isso no JWT!"
 *
 * BUG-009: No Email Verification Check in JWT Validation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';

describe('JwtStrategy - BUG DETECTION', () => {
  let strategy: JwtStrategy;
  let mockPrisma: { user: { findUnique: any } };

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: mock(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: TokenBlacklistService,
          useValue: {
            addToBlacklist: mock(),
            revokeAllUserTokens: mock(),
            isTokenRevokedForUser: mock().mockResolvedValue(false),
            isBlacklisted: mock(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: mock().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('BUG-009: Email Verification Enforcement', () => {
    /**
     * CRITICAL BUG: User with unverified email can access protected endpoints!
     *
     * Business Rule: "Usuário não existe plenamente sem email verificado.
     * Sem verificação: não pode usar o sistema."
     *
     * Expected: Should throw UnauthorizedException for unverified users
     * Actual: Returns user without checking emailVerified
     */
    it('should REJECT user with unverified email (emailVerified = null)', async () => {
      const unverifiedUser = {
        id: 'user-123',
        email: 'unverified@example.com',
        name: 'Unverified User',
        hasCompletedOnboarding: true,
        emailVerified: null, // NOT VERIFIED!
      };
      mockPrisma.user.findUnique.mockResolvedValue(unverifiedUser);

      const payload = { sub: 'user-123', email: 'unverified@example.com' };

      // BUG: This should throw but doesn't!
      await expect(async () => await strategy.validate(payload)).toThrow(
        UnauthorizedException,
      );
    });

    it('should ALLOW user with verified email', async () => {
      const verifiedUser = {
        id: 'user-123',
        email: 'verified@example.com',
        name: 'Verified User',
        hasCompletedOnboarding: true,
        emailVerified: new Date(), // VERIFIED!
      };
      mockPrisma.user.findUnique.mockResolvedValue(verifiedUser);

      const payload = { sub: 'user-123', email: 'verified@example.com' };

      const result = await strategy.validate(payload);
      expect(result.userId).toBe('user-123');
    });

    it('should include emailVerified in query select', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test',
        hasCompletedOnboarding: true,
        emailVerified: new Date(),
      });

      await strategy.validate({ sub: 'user-123', email: 'test@example.com' });

      // BUG: The select doesn't include emailVerified!
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            emailVerified: true,
          }),
        }),
      );
    });
  });
});
