import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { InvalidTokenError } from '@octopus-synapse/profile-contracts';
import { VerificationTokenService } from './verification-token.service';
import { VerificationTokenRepository } from '../repositories/verification-token.repository';

describe('VerificationTokenService', () => {
  let service: VerificationTokenService;
  let verificationTokenRepository: {
    upsert: ReturnType<typeof mock>;
    findByToken: ReturnType<typeof mock>;
    deleteByToken: ReturnType<typeof mock>;
    isExpired: ReturnType<typeof mock>;
  };

  beforeEach(async () => {
    verificationTokenRepository = {
      upsert: mock(() => Promise.resolve({})),
      findByToken: mock(() => Promise.resolve(null)),
      deleteByToken: mock(() => Promise.resolve()),
      isExpired: mock(() => false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationTokenService,
        {
          provide: VerificationTokenRepository,
          useValue: verificationTokenRepository,
        },
      ],
    }).compile();

    service = module.get<VerificationTokenService>(VerificationTokenService);
  });

  describe('createEmailVerificationToken', () => {
    it('should create email verification token', async () => {
      const email = 'user@example.com';

      const token = await service.createEmailVerificationToken(email);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(verificationTokenRepository.upsert).toHaveBeenCalledWith({
        identifier: email,
        token,
        expires: expect.any(Date),
      });
    });

    it('should set expiry time correctly for email verification', async () => {
      const email = 'user@example.com';
      const beforeTime = Date.now();
      let capturedArgs: any;

      // Replace mock with a function that captures arguments
      verificationTokenRepository.upsert = async (args: any) => {
        capturedArgs = args;
        return {};
      };

      await service.createEmailVerificationToken(email);

      const afterTime = Date.now();

      // Should be at least 23 hours in future (allowing for execution time)
      const minExpiry = beforeTime + 23 * 60 * 60 * 1000;
      const maxExpiry = afterTime + 25 * 60 * 60 * 1000;

      expect(capturedArgs).toBeDefined();
      expect(capturedArgs.expires).toBeDefined();

      // The expires should be a Date object - check its validity
      const expires = capturedArgs.expires;
      const expiryTime =
        expires instanceof Date ? expires.getTime() : Number(expires);
      expect(typeof expiryTime).toBe('number');
      expect(Number.isNaN(expiryTime)).toBe(false);
      expect(expiryTime).toBeGreaterThan(minExpiry);
      expect(expiryTime).toBeLessThan(maxExpiry);
    });

    it('should upsert token to handle existing tokens', async () => {
      const email = 'existing@example.com';

      await service.createEmailVerificationToken(email);

      expect(verificationTokenRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: email,
          token: expect.any(String),
          expires: expect.any(Date),
        }),
      );
    });
  });

  describe('createPasswordResetToken', () => {
    it('should create password reset token with prefix', async () => {
      const email = 'user@example.com';

      const token = await service.createPasswordResetToken(email);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(verificationTokenRepository.upsert).toHaveBeenCalledWith({
        identifier: `reset:${email}`,
        token,
        expires: expect.any(Date),
      });
    });

    it('should set shorter expiry for password reset tokens', async () => {
      const email = 'user@example.com';
      const beforeTime = Date.now();
      let capturedArgs: any;

      // Replace mock with a function that captures arguments
      verificationTokenRepository.upsert = async (args: any) => {
        capturedArgs = args;
        return {};
      };

      await service.createPasswordResetToken(email);

      const afterTime = Date.now();

      // Should be ~1 hour in future
      const minExpiry = beforeTime + 50 * 60 * 1000; // 50 minutes
      const maxExpiry = afterTime + 70 * 60 * 1000; // 70 minutes

      expect(capturedArgs).toBeDefined();
      expect(capturedArgs.expires).toBeInstanceOf(Date);
      const expiryTime = capturedArgs.expires.getTime();
      expect(expiryTime).toBeGreaterThan(minExpiry);
      expect(expiryTime).toBeLessThan(maxExpiry);
    });
  });

  describe('validateEmailVerificationToken', () => {
    it('should validate and delete valid email verification token', async () => {
      const token = 'valid-email-token';
      const email = 'user@example.com';
      const mockToken = {
        identifier: email,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour future
      };

      verificationTokenRepository.findByToken.mockResolvedValue(mockToken);
      verificationTokenRepository.isExpired.mockReturnValue(false);

      const result = await service.validateEmailVerificationToken(token);

      expect(result).toBe(email);
      expect(verificationTokenRepository.deleteByToken).toHaveBeenCalledWith(
        token,
      );
    });

    it('should throw InvalidTokenError for non-existent token', async () => {
      const token = 'nonexistent-token';

      verificationTokenRepository.findByToken.mockResolvedValue(null);

      await expect(
        service.validateEmailVerificationToken(token),
      ).rejects.toThrow(InvalidTokenError);
    });

    it('should throw InvalidTokenError for expired token', async () => {
      const token = 'expired-token';
      const mockToken = {
        identifier: 'user@example.com',
        token,
        expires: new Date(Date.now() - 60 * 1000), // 1 minute ago
      };

      verificationTokenRepository.findByToken.mockResolvedValue(mockToken);
      verificationTokenRepository.isExpired.mockReturnValue(true);

      await expect(
        service.validateEmailVerificationToken(token),
      ).rejects.toThrow(InvalidTokenError);

      // Should attempt to clean up expired token (async, may not complete)
      expect(verificationTokenRepository.deleteByToken).toHaveBeenCalledWith(
        token,
      );
    });

    it('should handle cleanup failure for expired tokens gracefully', async () => {
      const token = 'expired-token';
      const mockToken = {
        identifier: 'user@example.com',
        token,
        expires: new Date(Date.now() - 60 * 1000),
      };

      verificationTokenRepository.findByToken.mockResolvedValue(mockToken);
      verificationTokenRepository.isExpired.mockReturnValue(true);
      verificationTokenRepository.deleteByToken.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.validateEmailVerificationToken(token),
      ).rejects.toThrow(InvalidTokenError);
    });
  });

  describe('validatePasswordResetToken', () => {
    it('should validate and return email from reset token', async () => {
      const token = 'valid-reset-token';
      const email = 'user@example.com';
      const mockToken = {
        identifier: `reset:${email}`,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      };

      verificationTokenRepository.findByToken.mockResolvedValue(mockToken);
      verificationTokenRepository.isExpired.mockReturnValue(false);

      const result = await service.validatePasswordResetToken(token);

      expect(result).toBe(email);
      expect(verificationTokenRepository.deleteByToken).toHaveBeenCalledWith(
        token,
      );
    });

    it('should throw InvalidTokenError for email verification token', async () => {
      const token = 'email-verification-token';
      const mockToken = {
        identifier: 'user@example.com', // No "reset:" prefix
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      };

      verificationTokenRepository.findByToken.mockResolvedValue(mockToken);
      verificationTokenRepository.isExpired.mockReturnValue(false);

      await expect(
        async () => await service.validatePasswordResetToken(token),
      ).toThrow(InvalidTokenError);
    });

    it('should throw InvalidTokenError for null token', async () => {
      const token = 'nonexistent-reset-token';

      verificationTokenRepository.findByToken.mockResolvedValue(null);

      await expect(
        async () => await service.validatePasswordResetToken(token),
      ).toThrow(InvalidTokenError);
    });

    it('should throw InvalidTokenError for expired reset token', async () => {
      const token = 'expired-reset-token';
      const mockToken = {
        identifier: 'reset:user@example.com',
        token,
        expires: new Date(Date.now() - 60 * 1000),
      };

      verificationTokenRepository.findByToken.mockResolvedValue(mockToken);
      verificationTokenRepository.isExpired.mockReturnValue(true);

      await expect(
        async () => await service.validatePasswordResetToken(token),
      ).toThrow(InvalidTokenError);
    });

    it('should extract email correctly from prefixed identifier', async () => {
      const email = 'complex.email+tag@example.com';
      const token = 'reset-token';
      const mockToken = {
        identifier: `reset:${email}`,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      };

      verificationTokenRepository.findByToken.mockResolvedValue(mockToken);
      verificationTokenRepository.isExpired.mockReturnValue(false);

      const result = await service.validatePasswordResetToken(token);

      expect(result).toBe(email);
    });
  });

  describe('token generation', () => {
    it('should generate different tokens on subsequent calls', async () => {
      const email = 'user@example.com';

      const token1 = await service.createEmailVerificationToken(email);
      const token2 = await service.createEmailVerificationToken(email);

      expect(token1).not.toBe(token2);
    });

    it('should generate hex string tokens', async () => {
      const email = 'user@example.com';

      const token = await service.createEmailVerificationToken(email);

      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });
});
