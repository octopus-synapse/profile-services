import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { VerificationTokenService } from './verification-token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../../common/constants/config';

describe('VerificationTokenService', () => {
  let service: VerificationTokenService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockUpsert = mock();
    const mockFindUnique = mock();
    const mockDelete = mock();

    prismaService = {
      verificationToken: {
        upsert: mockUpsert,
        findUnique: mockFindUnique,
        delete: mockDelete,
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationTokenService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<VerificationTokenService>(VerificationTokenService);
  });

  describe('createEmailVerificationToken', () => {
    it('should create email verification token', async () => {
      const email = 'user@example.com';
      const mockUpsert = prismaService.verificationToken.upsert as any;
      mockUpsert.mockResolvedValue({});

      const token = await service.createEmailVerificationToken(email);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(mockUpsert).toHaveBeenCalledWith({
        where: {
          identifier_token: {
            identifier: email,
            token,
          },
        },
        update: expect.objectContaining({
          token,
          expires: expect.any(Date),
        }),
        create: expect.objectContaining({
          identifier: email,
          token,
          expires: expect.any(Date),
        }),
      });
    });

    it('should set expiry time correctly for email verification', async () => {
      const email = 'user@example.com';
      const beforeTime = Date.now();
      const mockUpsert = prismaService.verificationToken.upsert as any;
      mockUpsert.mockResolvedValue({});

      await service.createEmailVerificationToken(email);

      const callArgs = mockUpsert.mock.calls[0][0];
      const expiryTime = callArgs.create.expires.getTime();
      const afterTime = Date.now();

      // Should be at least 23 hours in future (allowing for execution time)
      const minExpiry = beforeTime + 23 * 60 * 60 * 1000;
      const maxExpiry = afterTime + 25 * 60 * 60 * 1000;

      expect(expiryTime).toBeGreaterThan(minExpiry);
      expect(expiryTime).toBeLessThan(maxExpiry);
    });

    it('should upsert token to handle existing tokens', async () => {
      const email = 'existing@example.com';
      const mockUpsert = prismaService.verificationToken.upsert as any;
      mockUpsert.mockResolvedValue({});

      await service.createEmailVerificationToken(email);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.any(Object),
          create: expect.any(Object),
        }),
      );
    });
  });

  describe('createPasswordResetToken', () => {
    it('should create password reset token with prefix', async () => {
      const email = 'user@example.com';
      const mockUpsert = prismaService.verificationToken.upsert as any;
      mockUpsert.mockResolvedValue({});

      const token = await service.createPasswordResetToken(email);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(mockUpsert).toHaveBeenCalledWith({
        where: {
          identifier_token: {
            identifier: `reset:${email}`,
            token,
          },
        },
        update: expect.objectContaining({
          token,
          expires: expect.any(Date),
        }),
        create: expect.objectContaining({
          identifier: `reset:${email}`,
          token,
          expires: expect.any(Date),
        }),
      });
    });

    it('should set shorter expiry for password reset tokens', async () => {
      const email = 'user@example.com';
      const beforeTime = Date.now();
      const mockUpsert = prismaService.verificationToken.upsert as any;
      mockUpsert.mockResolvedValue({});

      await service.createPasswordResetToken(email);

      const callArgs = mockUpsert.mock.calls[0][0];
      const expiryTime = callArgs.create.expires.getTime();
      const afterTime = Date.now();

      // Should be ~1 hour in future
      const minExpiry = beforeTime + 50 * 60 * 1000; // 50 minutes
      const maxExpiry = afterTime + 70 * 60 * 1000; // 70 minutes

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

      const mockFindUnique = prismaService.verificationToken
        .findUnique as any;
      const mockDelete = prismaService.verificationToken.delete as any;
      mockFindUnique.mockResolvedValue(mockToken);
      mockDelete.mockResolvedValue(mockToken);

      const result = await service.validateEmailVerificationToken(token);

      expect(result).toBe(email);
      expect(mockDelete).toHaveBeenCalledWith({ where: { token } });
    });

    it('should throw BadRequestException for non-existent token', async () => {
      const token = 'nonexistent-token';

      const mockFindUnique = prismaService.verificationToken
        .findUnique as any;
      mockFindUnique.mockResolvedValue(null);

      await expect(
        service.validateEmailVerificationToken(token),
      ).rejects.toThrow(
        new BadRequestException(ERROR_MESSAGES.INVALID_VERIFICATION_TOKEN),
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const token = 'expired-token';
      const mockToken = {
        identifier: 'user@example.com',
        token,
        expires: new Date(Date.now() - 60 * 1000), // 1 minute ago
      };

      const mockFindUnique = prismaService.verificationToken
        .findUnique as any;
      const mockDelete = prismaService.verificationToken.delete as any;
      mockFindUnique.mockResolvedValue(mockToken);
      mockDelete.mockResolvedValue(mockToken);

      await expect(
        service.validateEmailVerificationToken(token),
      ).rejects.toThrow(new BadRequestException(ERROR_MESSAGES.TOKEN_EXPIRED));

      // Should attempt to clean up expired token (async, may not complete)
      expect(mockDelete).toHaveBeenCalledWith({ where: { token } });
    });

    it('should handle cleanup failure for expired tokens gracefully', async () => {
      const token = 'expired-token';
      const mockToken = {
        identifier: 'user@example.com',
        token,
        expires: new Date(Date.now() - 60 * 1000),
      };

      const mockFindUnique = prismaService.verificationToken
        .findUnique as any;
      const mockDelete = prismaService.verificationToken.delete as any;
      mockFindUnique.mockResolvedValue(mockToken);
      mockDelete.mockRejectedValue(new Error('Database error'));

      await expect(
        service.validateEmailVerificationToken(token),
      ).rejects.toThrow(new BadRequestException(ERROR_MESSAGES.TOKEN_EXPIRED));
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

      const mockFindUnique = prismaService.verificationToken
        .findUnique as any;
      const mockDelete = prismaService.verificationToken.delete as any;
      mockFindUnique.mockResolvedValue(mockToken);
      mockDelete.mockResolvedValue(mockToken);

      const result = await service.validatePasswordResetToken(token);

      expect(result).toBe(email);
      expect(mockDelete).toHaveBeenCalledWith({ where: { token } });
    });

    it('should throw BadRequestException for email verification token', async () => {
      const token = 'email-verification-token';
      const mockToken = {
        identifier: 'user@example.com', // No "reset:" prefix
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      };

      const mockFindUnique = prismaService.verificationToken
        .findUnique as any;
      mockFindUnique.mockResolvedValue(mockToken);

      await expect(service.validatePasswordResetToken(token)).rejects.toThrow(
        new BadRequestException(ERROR_MESSAGES.INVALID_RESET_TOKEN),
      );
    });

    it('should throw BadRequestException for null token', async () => {
      const token = 'nonexistent-reset-token';

      const mockFindUnique = prismaService.verificationToken
        .findUnique as any;
      mockFindUnique.mockResolvedValue(null);

      await expect(service.validatePasswordResetToken(token)).rejects.toThrow(
        new BadRequestException(ERROR_MESSAGES.INVALID_RESET_TOKEN),
      );
    });

    it('should throw BadRequestException for expired reset token', async () => {
      const token = 'expired-reset-token';
      const mockToken = {
        identifier: 'reset:user@example.com',
        token,
        expires: new Date(Date.now() - 60 * 1000),
      };

      const mockFindUnique = prismaService.verificationToken
        .findUnique as any;
      const mockDelete = prismaService.verificationToken.delete as any;
      mockFindUnique.mockResolvedValue(mockToken);
      mockDelete.mockResolvedValue(mockToken);

      await expect(service.validatePasswordResetToken(token)).rejects.toThrow(
        new BadRequestException(ERROR_MESSAGES.TOKEN_EXPIRED),
      );
    });

    it('should extract email correctly from prefixed identifier', async () => {
      const email = 'complex.email+tag@example.com';
      const token = 'reset-token';
      const mockToken = {
        identifier: `reset:${email}`,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      };

      const mockFindUnique = prismaService.verificationToken
        .findUnique as any;
      const mockDelete = prismaService.verificationToken.delete as any;
      mockFindUnique.mockResolvedValue(mockToken);
      mockDelete.mockResolvedValue(mockToken);

      const result = await service.validatePasswordResetToken(token);

      expect(result).toBe(email);
    });
  });

  describe('token generation', () => {
    it('should generate different tokens on subsequent calls', async () => {
      const email = 'user@example.com';
      const mockUpsert = prismaService.verificationToken.upsert as any;
      mockUpsert.mockResolvedValue({});

      const token1 = await service.createEmailVerificationToken(email);
      const token2 = await service.createEmailVerificationToken(email);

      expect(token1).not.toBe(token2);
    });

    it('should generate hex string tokens', async () => {
      const email = 'user@example.com';
      const mockUpsert = prismaService.verificationToken.upsert as any;
      mockUpsert.mockResolvedValue({});

      const token = await service.createEmailVerificationToken(email);

      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });
});
