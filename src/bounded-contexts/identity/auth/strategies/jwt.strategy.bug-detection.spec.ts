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
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
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
     * BUG-009 FIX: Email verification was moved from JwtStrategy to EmailVerifiedGuard
     *
     * Business Rule: "Usuário não existe plenamente sem email verificado.
     * Sem verificação: não pode usar o sistema."
     *
     * Architecture Decision:
     * - JwtStrategy: Validates token and returns user payload with emailVerified status
     * - EmailVerifiedGuard: Enforces email verification on protected routes
     * - @AllowUnverifiedEmail(): Decorator to bypass email check on specific endpoints
     *
     * This allows endpoints like /verify-email/request to work before verification.
     */
    it('should ALLOW user with unverified email (enforcement is in EmailVerifiedGuard)', async () => {
      const unverifiedUser = {
        id: 'user-123',
        email: 'unverified@example.com',
        name: 'Unverified User',
        hasCompletedOnboarding: true,
        emailVerified: null, // NOT VERIFIED - but JwtStrategy allows it
      };
      mockPrisma.user.findUnique.mockResolvedValue(unverifiedUser);

      const payload = { sub: 'user-123', email: 'unverified@example.com' };

      // JwtStrategy should allow and include emailVerified in response
      // EmailVerifiedGuard will enforce verification
      const result = await strategy.validate(payload);
      expect(result.userId).toBe('user-123');
      expect(result.emailVerified).toBe(false); // Converted to boolean
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
