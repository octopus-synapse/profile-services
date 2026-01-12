/**
 * Auth Core Service
 * Single Responsibility: Core authentication operations (signup, login, token refresh)
 *
 * BUG-001 FIX: Uses Prisma transactions with unique constraints to prevent TOCTOU
 */

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { User, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import type { RegisterCredentials as Signup } from '@octopus-synapse/profile-contracts';
import type { LoginCredentials as Login } from '@octopus-synapse/profile-contracts';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';
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

  async signup(dto: Signup) {
    const { email, password, name } = dto;

    const hashedPassword = await this.passwordService.hash(password);

    // BUG-001 FIX: Use try-catch with Prisma unique constraint error handling
    // instead of check-then-create (TOCTOU vulnerable)
    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          name: name ?? email.split('@')[0],
          password: hashedPassword,
          hasCompletedOnboarding: false,
        },
      });
    } catch (error) {
      // Handle unique constraint violation (P2002)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(`Signup attempt for existing email`, this.context, {
          email,
        });
        throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
      }
      throw error;
    }

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

  async login(dto: Login) {
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
  }

  private buildAuthResponse(
    user: {
      id: string;
      email: string | null;
      name: string | null;
      role: UserRole;
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
    // Ensure role is UserRole type for token generation
    const userRole: UserRole =
      typeof user.role === 'string' ? user.role : user.role;
    const refreshToken = this.tokenService.generateToken({
      id: user.id,
      email: user.email,
      role: userRole,
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
