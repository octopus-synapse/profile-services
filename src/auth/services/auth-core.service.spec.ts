import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole, Prisma } from '@prisma/client';
import { AuthCoreService } from './auth-core.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';
import { ERROR_MESSAGES } from '../../common/constants/config';

describe('AuthCoreService', () => {
  let service: AuthCoreService;
  let prisma: any;
  let logger: AppLoggerService;
  let tokenService: TokenService;
  let passwordService: PasswordService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    role: UserRole.USER,
    username: null,
    image: null,
    hasCompletedOnboarding: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: mock(),
        create: mock(),
      },
    };

    const mockLogger = {
      log: mock(),
      warn: mock(),
      error: mock(),
    };

    const mockTokenService = {
      generateToken: mock(),
    };

    const mockPasswordService = {
      hash: mock(),
      compare: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthCoreService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AppLoggerService, useValue: mockLogger },
        { provide: TokenService, useValue: mockTokenService },
        { provide: PasswordService, useValue: mockPasswordService },
      ],
    }).compile();

    service = module.get(AuthCoreService);
    prisma = module.get(PrismaService);
    logger = module.get(AppLoggerService);
    tokenService = module.get(TokenService);
    passwordService = module.get(PasswordService);
  });

  describe('signup', () => {
    const signupDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
    };

    it('should create new user and return auth response', async () => {
      const hashedPassword = 'hashed-password123';
      const token = 'jwt-token';
      const refreshToken = 'refresh-token';

      prisma.user.findUnique.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue(hashedPassword);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        email: signupDto.email,
        name: signupDto.name,
        password: hashedPassword,
      });
      tokenService.generateToken
        .mockReturnValueOnce(token)
        .mockReturnValueOnce(refreshToken);

      const result = await service.signup(signupDto);

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe(token);
      expect(result.data.refreshToken).toBe(refreshToken);
      expect(result.data.user.email).toBe(signupDto.email);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: signupDto.email,
          name: signupDto.name,
          password: hashedPassword,
          hasCompletedOnboarding: false,
        },
      });
    });

    it('should use email prefix as name when name not provided', async () => {
      const dtoWithoutName = {
        email: 'test@example.com',
        password: 'password123',
      };
      const hashedPassword = 'hashed-password';

      prisma.user.findUnique.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue(hashedPassword);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        email: dtoWithoutName.email,
        name: 'test',
        password: hashedPassword,
      });
      tokenService.generateToken.mockReturnValue('token');

      await service.signup(dtoWithoutName);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: dtoWithoutName.email,
          name: 'test',
          password: hashedPassword,
          hasCompletedOnboarding: false,
        },
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      const duplicateError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0' },
      );
      prisma.user.create.mockRejectedValue(duplicateError);

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.signup(signupDto)).rejects.toThrow(
        ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should throw when user email is null after creation', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        email: null,
      });

      await expect(service.signup(signupDto)).rejects.toThrow(
        'User email is required after registration',
      );
    });

    it('should log successful signup', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        email: signupDto.email,
      });
      tokenService.generateToken.mockReturnValue('token');

      await service.signup(signupDto);

      expect(logger.log).toHaveBeenCalledWith(
        'User registered successfully',
        'AuthCoreService',
        expect.objectContaining({
          userId: mockUser.id,
          email: signupDto.email,
        }),
      );
    });
  });

  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'password123';

    it('should return user without password when credentials valid', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(result).toBeDefined();
      expect(result?.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('password');
      expect(passwordService.compare).toHaveBeenCalledWith(
        password,
        mockUser.password,
      );
    });

    it('should return null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed login attempt - user not found',
        'AuthCoreService',
        { email },
      );
    });

    it('should return null when user has no password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: null,
      });

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return null when password invalid', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(false);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed login attempt - invalid password',
        'AuthCoreService',
        { email },
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return auth response when credentials valid', async () => {
      const token = 'jwt-token';
      const refreshToken = 'refresh-token';

      prisma.user.findUnique.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(true);
      tokenService.generateToken
        .mockReturnValueOnce(token)
        .mockReturnValueOnce(refreshToken);

      const result = await service.login(loginDto);

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe(token);
      expect(result.data.refreshToken).toBe(refreshToken);
      expect(result.data.user.email).toBe(mockUser.email);
      expect(result.data.user.id).toBe(mockUser.id);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
    });

    it('should throw UnauthorizedException when password invalid', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        ERROR_MESSAGES.INVALID_CREDENTIALS,
      );
    });

    it('should throw when validated user has null email', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        email: null,
      });
      passwordService.compare.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should log successful login', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(true);
      tokenService.generateToken.mockReturnValue('token');

      await service.login(loginDto);

      expect(logger.log).toHaveBeenCalledWith(
        'User logged in successfully',
        'AuthCoreService',
        expect.objectContaining({ userId: mockUser.id, email: mockUser.email }),
      );
    });

    it('should generate correct token payload', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(true);
      tokenService.generateToken.mockReturnValue('token');

      await service.login(loginDto);

      expect(tokenService.generateToken).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        hasCompletedOnboarding: mockUser.hasCompletedOnboarding,
      });
    });

    it('should include all user fields in response', async () => {
      const adminUser = {
        ...mockUser,
        role: UserRole.ADMIN,
        username: 'testuser',
        image: 'avatar.jpg',
        hasCompletedOnboarding: true,
      };

      prisma.user.findUnique.mockResolvedValue(adminUser);
      passwordService.compare.mockResolvedValue(true);
      tokenService.generateToken.mockReturnValue('token');

      const result = await service.login(loginDto);

      expect(result.data.user).toEqual({
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        username: adminUser.username,
        image: adminUser.image,
        hasCompletedOnboarding: adminUser.hasCompletedOnboarding,
      });
    });
  });
});
