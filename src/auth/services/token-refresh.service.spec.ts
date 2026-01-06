import { Test, TestingModule } from '@nestjs/testing';
import { TokenRefreshService } from './token-refresh.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { TokenService } from './token.service';
import { UnauthorizedException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../../common/constants/config';

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let prismaService: jest.Mocked<PrismaService>;
  let logger: jest.Mocked<AppLoggerService>;
  let tokenService: jest.Mocked<TokenService>;

  beforeEach(async () => {
    const mockFindUnique = jest.fn();

    prismaService = {
      user: {
        findUnique: mockFindUnique,
      },
    } as any;

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    tokenService = {
      generateToken: jest.fn(),
      verifyToken: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenRefreshService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AppLoggerService, useValue: logger },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get<TokenRefreshService>(TokenRefreshService);
  });

  describe('refreshToken', () => {
    it('should generate new tokens for valid user', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        name: 'John Doe',
        role: 'USER',
        hasCompletedOnboarding: true,
      };
      const mockAccessToken = 'new-access-token';
      const mockRefreshToken = 'new-refresh-token';

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);
      tokenService.generateToken
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = await service.refreshToken(userId);

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe(mockAccessToken);
      expect(result.data.refreshToken).toBe(mockRefreshToken);
      expect(result.data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        hasCompletedOnboarding: mockUser.hasCompletedOnboarding,
      });
      expect(tokenService.generateToken).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const userId = 'nonexistent-user';

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(null);

      await expect(service.refreshToken(userId)).rejects.toThrow(
        new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND),
      );

      expect(logger.warn).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user email is null', async () => {
      const userId = 'user-without-email';

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue({
        id: userId,
        email: null,
        name: 'User',
        role: 'USER',
        hasCompletedOnboarding: false,
      });

      await expect(service.refreshToken(userId)).rejects.toThrow(
        new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND),
      );
    });

    it('should generate tokens with correct payload', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
        hasCompletedOnboarding: true,
      };

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);
      tokenService.generateToken.mockReturnValue('token');

      await service.refreshToken(userId);

      expect(tokenService.generateToken).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        hasCompletedOnboarding: mockUser.hasCompletedOnboarding,
      });
    });
  });

  describe('refreshWithToken', () => {
    it('should refresh tokens using valid refresh token', async () => {
      const oldRefreshToken = 'valid-refresh-token';
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        name: 'Jane Doe',
        role: 'USER',
        hasCompletedOnboarding: false,
      };
      const mockAccessToken = 'new-access-token';
      const mockRefreshToken = 'new-refresh-token';

      tokenService.verifyToken.mockReturnValue({
        sub: userId,
        email: mockUser.email,
        role: mockUser.role,
        hasCompletedOnboarding: mockUser.hasCompletedOnboarding,
      } as any);
      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);
      tokenService.generateToken
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = await service.refreshWithToken(oldRefreshToken);

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe(mockAccessToken);
      expect(tokenService.verifyToken).toHaveBeenCalledWith(oldRefreshToken);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const invalidToken = 'invalid-token';

      tokenService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshWithToken(invalidToken)).rejects.toThrow(
        new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED),
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid refresh token',
        'TokenRefreshService',
      );
    });

    it('should throw UnauthorizedException when decoded user not found', async () => {
      const refreshToken = 'valid-token-nonexistent-user';
      const userId = 'nonexistent';

      tokenService.verifyToken.mockReturnValue({
        sub: userId,
        email: 'nonexistent@example.com',
        role: 'USER',
        hasCompletedOnboarding: false,
      } as any);
      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(null);

      await expect(service.refreshWithToken(refreshToken)).rejects.toThrow(
        new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED),
      );
    });

    it('should handle token verification errors gracefully', async () => {
      const expiredToken = 'expired-token';

      tokenService.verifyToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(service.refreshWithToken(expiredToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user data', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        name: 'John Doe',
        username: 'johndoe',
        role: 'USER',
        image: 'https://example.com/avatar.jpg',
        hasCompletedOnboarding: true,
        createdAt: new Date('2024-01-01'),
      };

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser(userId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          image: true,
          hasCompletedOnboarding: true,
          createdAt: true,
        },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const userId = 'nonexistent';

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser(userId)).rejects.toThrow(
        new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND),
      );
    });

    it('should return user with null fields correctly', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        name: null,
        username: null,
        role: 'USER',
        image: null,
        hasCompletedOnboarding: false,
        createdAt: new Date(),
      };

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser(userId);

      expect(result.data.name).toBeNull();
      expect(result.data.username).toBeNull();
      expect(result.data.image).toBeNull();
    });

    it('should return admin user data correctly', async () => {
      const userId = 'admin-123';
      const mockUser = {
        id: userId,
        email: 'admin@example.com',
        name: 'Admin',
        username: 'admin',
        role: 'ADMIN',
        image: null,
        hasCompletedOnboarding: true,
        createdAt: new Date(),
      };

      const mockFindUnique = prismaService.user.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser(userId);

      expect(result.data.role).toBe('ADMIN');
    });
  });
});
