/**
 * Auth Core Service
 * Single Responsibility: Core authentication operations (signup, login, token refresh)
 */

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { SignupDto } from '../dto/signup.dto';
import { LoginDto } from '../dto/login.dto';
import { ERROR_MESSAGES } from '../../common/constants/app.constants';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';

type ValidatedUser = Omit<User, 'password'>;

@Injectable()
export class AuthCoreService {
  private readonly context = 'AuthCoreService';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
  ) {}

  async signup(dto: SignupDto) {
    const { email, password, name } = dto;

    await this.ensureEmailNotExists(email);

    const hashedPassword = await this.passwordService.hash(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: name ?? email.split('@')[0],
        password: hashedPassword,
        hasCompletedOnboarding: false,
      },
    });

    this.logger.log(`User registered successfully`, this.context, {
      userId: user.id,
      email,
    });

    if (!user.email) {
      throw new Error('User email is required after registration');
    }

    const token = this.tokenService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    });

    return this.buildAuthResponse(user, token);
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<ValidatedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user?.password) {
      this.logger.warn(`Failed login attempt - user not found`, this.context, {
        email,
      });
      return null;
    }

    const isPasswordValid = await this.passwordService.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(
        `Failed login attempt - invalid password`,
        this.context,
        { email },
      );
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.validateUser(dto.email, dto.password);

      if (!user) {
        throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      if (!user.email) {
        throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }

      const token = this.tokenService.generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      });

      this.logger.log(`User logged in successfully`, this.context, {
        userId: user.id,
        email: user.email,
      });

      return this.buildAuthResponse(user, token);
    } catch (error) {
      // Re-throw UnauthorizedException as-is
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Log and re-throw other errors
      this.logger.error(
        'Login error',
        error instanceof Error ? error.stack : undefined,
        this.context,
        { email: dto.email },
      );
      throw error;
    }
  }

  private async ensureEmailNotExists(email: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.logger.warn(`Signup attempt for existing email`, this.context, {
        email,
      });
      throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }
  }

  private buildAuthResponse(
    user: {
      id: string;
      email: string | null;
      name: string | null;
      role: string;
      username?: string | null;
      image?: string | null;
      hasCompletedOnboarding: boolean;
    },
    token: string,
  ) {
    if (!user.email) {
      throw new Error('User email is required for token generation');
    }

    // Generate refresh token (for simplicity, using same token generation)
    // In production, use a separate refresh token with longer expiry
    const refreshToken = this.tokenService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    });

    return {
      success: true,
      data: {
        accessToken: token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          username: user.username ?? null,
          image: user.image ?? null,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
        },
      },
    };
  }
}
