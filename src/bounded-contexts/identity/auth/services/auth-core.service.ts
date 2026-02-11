/**
 * Auth Core Service
 * Single Responsibility: Core authentication operations (signup, login, token refresh)
 *
 * BUG-001 FIX: Uses Prisma transactions with unique constraints to prevent TOCTOU
 *
 * Note: Role-based authorization has been replaced with permission-based.
 * JWT tokens no longer contain role information. Permissions are resolved
 * dynamically via AuthorizationService.
 *
 * Events Emitted:
 * - UserRegisteredEvent: When a new user successfully registers
 */

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { UserRegisteredEvent } from '@/bounded-contexts/identity/domain/events';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoginCredentials as Login, RegisterCredentials as Signup } from '@/shared-kernel';
import { ERROR_MESSAGES, EventPublisher } from '@/shared-kernel';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

type ValidatedUser = Omit<User, 'password'>;

@Injectable()
export class AuthCoreService {
  private readonly context = 'AuthCoreService';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async signup(registerCredentials: Signup) {
    const { email, password, name } = registerCredentials;

    const hashedPassword = await this.passwordService.hash(password);

    // BUG-001 FIX: Use try-catch with Prisma unique constraint error handling
    // instead of check-then-create (TOCTOU vulnerable)
    let createdUser: User;
    try {
      const userCreationData = {
        email,
        name: name ?? email.split('@')[0],
        password: hashedPassword,
        hasCompletedOnboarding: false,
      };
      createdUser = await this.prisma.user.create({
        data: userCreationData,
      });
    } catch (error) {
      // Handle unique constraint violation (P2002)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.warn(`Signup attempt for existing email`, this.context, {
          email,
        });
        throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
      }
      throw error;
    }

    this.logger.log(`User registered successfully`, this.context, {
      userId: createdUser.id,
      email,
    });

    if (!createdUser.email) {
      throw new Error('User email is required after registration');
    }

    // Emit user registered event
    this.eventPublisher.publish(
      new UserRegisteredEvent(createdUser.id, {
        email: createdUser.email,
        username: createdUser.username ?? createdUser.name ?? email.split('@')[0],
      }),
    );

    const accessTokenPayload = {
      id: createdUser.id,
      email: createdUser.email,
      hasCompletedOnboarding: createdUser.hasCompletedOnboarding,
    };
    const accessToken = this.tokenService.generateToken(accessTokenPayload);

    return this.buildAuthResponse(createdUser, accessToken);
  }

  async validateUser(email: string, password: string): Promise<ValidatedUser | null> {
    const foundUser = await this.prisma.user.findUnique({ where: { email } });

    if (!foundUser?.password) {
      this.logger.warn(`Failed login attempt - user not found`, this.context, {
        email,
      });
      return null;
    }

    const isPasswordValid = await this.passwordService.compare(password, foundUser.password);

    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt - invalid password`, this.context, { email });
      return null;
    }

    const { password: _passwordField, ...validatedUserWithoutPassword } = foundUser;
    return validatedUserWithoutPassword;
  }

  async login(loginCredentials: Login) {
    const validatedUser = await this.validateUser(
      loginCredentials.email,
      loginCredentials.password,
    );

    if (!validatedUser) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    if (!validatedUser.email) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const accessTokenPayload = {
      id: validatedUser.id,
      email: validatedUser.email,
      hasCompletedOnboarding: validatedUser.hasCompletedOnboarding,
    };
    const accessToken = this.tokenService.generateToken(accessTokenPayload);

    this.logger.log(`User logged in successfully`, this.context, {
      userId: validatedUser.id,
      email: validatedUser.email,
    });

    return this.buildAuthResponse(validatedUser, accessToken);
  }

  private buildAuthResponse(
    authenticatedUser: {
      id: string;
      email: string | null;
      name: string | null;
      username?: string | null;
      image?: string | null;
      hasCompletedOnboarding: boolean;
    },
    accessToken: string,
  ) {
    if (!authenticatedUser.email) {
      throw new Error('User email is required for token generation');
    }

    // Generate refresh token (for simplicity, using same token generation)
    // In production, use a separate refresh token with longer expiry
    const refreshTokenPayload = {
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      hasCompletedOnboarding: authenticatedUser.hasCompletedOnboarding,
    };
    const refreshToken = this.tokenService.generateToken(refreshTokenPayload);

    const authResponseData = {
      accessToken,
      refreshToken,
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        username: authenticatedUser.username ?? null,
        image: authenticatedUser.image ?? null,
        hasCompletedOnboarding: authenticatedUser.hasCompletedOnboarding,
      },
    };

    return {
      success: true,
      data: authResponseData,
    };
  }
}
