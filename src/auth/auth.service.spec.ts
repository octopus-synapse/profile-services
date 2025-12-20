import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger/logger.service';
import { EmailService } from '../common/email/email.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let logger: AppLoggerService;
  let emailService: EmailService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    verificationToken: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendPasswordChangedEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: AppLoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    logger = module.get<LoggerService>(LoggerService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should successfully register a new user', async () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const hashedPassword = 'hashedPassword123';
      const mockUser = {
        id: 'user-123',
        email: signupDto.email,
        name: signupDto.name,
        password: hashedPassword,
        hasCompletedOnboarding: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve(hashedPassword as never));

      const result = await service.signup(signupDto);

      expect(result).toEqual({
        success: true,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          hasCompletedOnboarding: false,
        },
        token: 'mock-jwt-token',
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: signupDto.email },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const signupDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: signupDto.email,
      });

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash(loginDto.password, 12);
      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        name: 'Test User',
        password: hashedPassword,
        hasCompletedOnboarding: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true as never));

      const result = await service.login(loginDto);

      expect(result).toEqual({
        success: true,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          hasCompletedOnboarding: true,
        },
        token: 'mock-jwt-token',
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        password: 'hashedPassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false as never));

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token for valid user', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        hasCompletedOnboarding: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new-jwt-token');

      const result = await service.refreshToken(userId);

      expect(result).toEqual({
        success: true,
        token: 'new-jwt-token',
        user: mockUser,
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          hasCompletedOnboarding: true,
        },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('requestEmailVerification', () => {
    it('should create verification token and send email', async () => {
      const dto = { email: 'test@example.com' };
      const mockUser = {
        id: 'user-123',
        email: dto.email,
        name: 'Test User',
        emailVerified: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.verificationToken.upsert.mockResolvedValue({
        identifier: dto.email,
        token: 'verification-token',
        expires: new Date(),
      });

      const result = await service.requestEmailVerification(dto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Verification email sent');
      expect(mockPrismaService.verificationToken.upsert).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        dto.email,
        mockUser.name,
        expect.any(String),
      );
    });

    it('should return success even if user not found (prevent email enumeration)', async () => {
      const dto = { email: 'nonexistent@example.com' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.requestEmailVerification(dto);

      expect(result.success).toBe(true);
      expect(mockPrismaService.verificationToken.upsert).not.toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should not send email if already verified', async () => {
      const dto = { email: 'verified@example.com' };
      const mockUser = {
        id: 'user-123',
        email: dto.email,
        emailVerified: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.requestEmailVerification(dto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email is already verified');
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and send welcome email', async () => {
      const dto = { token: 'valid-token' };
      const mockToken = {
        identifier: 'test@example.com',
        token: dto.token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockPrismaService.verificationToken.findUnique.mockResolvedValue(
        mockToken,
      );
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.verificationToken.delete.mockResolvedValue(mockToken);

      const result = await service.verifyEmail(dto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email verified successfully');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockPrismaService.verificationToken.delete).toHaveBeenCalled();
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name,
      );
    });

    it('should throw BadRequestException for invalid token', async () => {
      const dto = { token: 'invalid-token' };
      mockPrismaService.verificationToken.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const dto = { token: 'expired-token' };
      const mockToken = {
        identifier: 'test@example.com',
        token: dto.token,
        expires: new Date(Date.now() - 1000), // Expired
      };

      mockPrismaService.verificationToken.findUnique.mockResolvedValue(
        mockToken,
      );
      mockPrismaService.verificationToken.delete.mockResolvedValue(mockToken);

      await expect(service.verifyEmail(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.verificationToken.delete).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should create reset token and send email', async () => {
      const dto = { email: 'test@example.com' };
      const mockUser = {
        id: 'user-123',
        email: dto.email,
        name: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.verificationToken.upsert.mockResolvedValue({
        identifier: `reset:${dto.email}`,
        token: 'reset-token',
        expires: new Date(),
      });

      const result = await service.forgotPassword(dto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password reset email sent');
      expect(mockPrismaService.verificationToken.upsert).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        dto.email,
        mockUser.name,
        expect.any(String),
      );
    });

    it('should return success even if user not found', async () => {
      const dto = { email: 'nonexistent@example.com' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(dto);

      expect(result.success).toBe(true);
      expect(mockPrismaService.verificationToken.upsert).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const dto = { token: 'reset-token', password: 'newpassword123' };
      const mockToken = {
        identifier: 'reset:test@example.com',
        token: dto.token,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      };

      mockPrismaService.verificationToken.findUnique.mockResolvedValue(
        mockToken,
      );
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.verificationToken.delete.mockResolvedValue(mockToken);

      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() =>
          Promise.resolve('hashed-new-password' as never),
        );

      const result = await service.resetPassword(dto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password reset successfully');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockPrismaService.verificationToken.delete).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      const dto = { token: 'invalid-token', password: 'newpassword123' };
      mockPrismaService.verificationToken.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password and send notification email', async () => {
      const userId = 'user-123';
      const dto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-old-password',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true as never));
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() =>
          Promise.resolve('hashed-new-password' as never),
        );

      const result = await service.changePassword(userId, dto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(emailService.sendPasswordChangedEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name,
      );
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      const userId = 'user-123';
      const dto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed-password',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false as never));

      await expect(service.changePassword(userId, dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
      expect(emailService.sendPasswordChangedEmail).not.toHaveBeenCalled();
    });
  });
});
