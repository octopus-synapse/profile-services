import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AuthenticationError,
  EmailConflictError,
} from '@octopus-synapse/profile-contracts';
import { AuthCoreService } from './auth-core.service';
import { AuthUserRepository } from '../repositories/auth-user.repository';
import { AppLoggerService } from '../../common/logger/logger.service';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';

describe('AuthCoreService', () => {
  let service: AuthCoreService;
  let authUserRepository: any;
  let logger: AppLoggerService;
  let tokenService: TokenService;
  let passwordService: PasswordService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    username: null,
    image: null,
    hasCompletedOnboarding: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockAuthUserRepository = {
      findByEmail: mock(),
      findById: mock(),
      create: mock(),
      isUniqueConstraintError: mock(() => false),
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
        { provide: AuthUserRepository, useValue: mockAuthUserRepository },
        { provide: AppLoggerService, useValue: mockLogger },
        { provide: TokenService, useValue: mockTokenService },
        { provide: PasswordService, useValue: mockPasswordService },
      ],
    }).compile();

    service = module.get(AuthCoreService);
    authUserRepository = module.get(AuthUserRepository);
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

      passwordService.hash.mockResolvedValue(hashedPassword);
      authUserRepository.create.mockResolvedValue({
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
      expect(authUserRepository.create).toHaveBeenCalledWith({
        email: signupDto.email,
        name: signupDto.name,
        password: hashedPassword,
        hasCompletedOnboarding: false,
      });
    });

    it('should use email prefix as name when name not provided', async () => {
      const dtoWithoutName = {
        email: 'test@example.com',
        password: 'password123',
      };
      const hashedPassword = 'hashed-password';

      passwordService.hash.mockResolvedValue(hashedPassword);
      authUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: dtoWithoutName.email,
        name: 'test',
        password: hashedPassword,
      });
      tokenService.generateToken.mockReturnValue('token');

      await service.signup(dtoWithoutName);

      expect(authUserRepository.create).toHaveBeenCalledWith({
        email: dtoWithoutName.email,
        name: 'test',
        password: hashedPassword,
        hasCompletedOnboarding: false,
      });
    });

    it('should throw EmailConflictError when email already exists', async () => {
      const duplicateError = new Error('Unique constraint failed');
      authUserRepository.create.mockRejectedValue(duplicateError);
      authUserRepository.isUniqueConstraintError.mockReturnValue(true);

      await expect(async () => await service.signup(signupDto)).toThrow(
        EmailConflictError,
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should throw when user email is null after creation', async () => {
      passwordService.hash.mockResolvedValue('hashed');
      authUserRepository.create.mockResolvedValue({
        ...mockUser,
        email: null,
      });

      await expect(async () => await service.signup(signupDto)).toThrow(
        'User email is required after registration',
      );
    });

    it('should log successful signup', async () => {
      passwordService.hash.mockResolvedValue('hashed');
      authUserRepository.create.mockResolvedValue({
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
      authUserRepository.findByEmail.mockResolvedValue(mockUser);
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
      authUserRepository.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed login attempt - user not found',
        'AuthCoreService',
        { email },
      );
    });

    it('should return null when user has no password', async () => {
      authUserRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        password: null,
      });

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return null when password invalid', async () => {
      authUserRepository.findByEmail.mockResolvedValue(mockUser);
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

      authUserRepository.findByEmail.mockResolvedValue(mockUser);
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

    it('should throw AuthenticationError when user not found', async () => {
      authUserRepository.findByEmail.mockResolvedValue(null);

      await expect(async () => await service.login(loginDto)).toThrow(
        AuthenticationError,
      );
    });

    it('should throw AuthenticationError when password invalid', async () => {
      authUserRepository.findByEmail.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(false);

      await expect(async () => await service.login(loginDto)).toThrow(
        AuthenticationError,
      );
    });

    it('should throw when validated user has null email', async () => {
      authUserRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        email: null,
      });
      passwordService.compare.mockResolvedValue(true);

      await expect(async () => await service.login(loginDto)).toThrow(
        AuthenticationError,
      );
    });

    it('should log successful login', async () => {
      authUserRepository.findByEmail.mockResolvedValue(mockUser);
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
      authUserRepository.findByEmail.mockResolvedValue(mockUser);
      passwordService.compare.mockResolvedValue(true);
      tokenService.generateToken.mockReturnValue('token');

      await service.login(loginDto);

      expect(tokenService.generateToken).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        hasCompletedOnboarding: mockUser.hasCompletedOnboarding,
      });
    });

    it('should include all user fields in response', async () => {
      const userWithAllFields = {
        ...mockUser,
        username: 'testuser',
        image: 'avatar.jpg',
        hasCompletedOnboarding: true,
      };

      authUserRepository.findByEmail.mockResolvedValue(userWithAllFields);
      passwordService.compare.mockResolvedValue(true);
      tokenService.generateToken.mockReturnValue('token');

      const result = await service.login(loginDto);

      expect(result.data.user).toEqual({
        id: userWithAllFields.id,
        email: userWithAllFields.email,
        name: userWithAllFields.name,
        username: userWithAllFields.username,
        image: userWithAllFields.image,
        hasCompletedOnboarding: userWithAllFields.hasCompletedOnboarding,
      });
    });
  });
});
