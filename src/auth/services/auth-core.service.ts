/**
 * Auth Core Service
 * Single Responsibility: Core authentication operations (signup, login, token refresh)
 *
 * BUG-001 FIX: Uses Prisma transactions with unique constraints to prevent TOCTOU
 *
 * Note: Role-based authorization has been replaced with permission-based.
 * JWT tokens no longer contain role information. Permissions are resolved
 * dynamically via AuthorizationService.
 */

import { Injectable } from '@nestjs/common';
import {
  AuthenticationError,
  EmailConflictError,
} from '@octopus-synapse/profile-contracts';
import { User } from '@prisma/client';
import { AppLoggerService } from '../../common/logger/logger.service';
import type { RegisterCredentials as Signup } from '@octopus-synapse/profile-contracts';
import type { LoginCredentials as Login } from '@octopus-synapse/profile-contracts';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';
import { AuthUserRepository } from '../repositories';

type ValidatedUser = Omit<User, 'password'>;

@Injectable()
export class AuthCoreService {
  private readonly context = 'AuthCoreService';

  constructor(
    private readonly userRepo: AuthUserRepository,
    private readonly logger: AppLoggerService,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
  ) {}

  async signup(registerCredentials: Signup) {
    const { email, password, name } = registerCredentials;

    const hashedPassword = await this.passwordService.hash(password);

    // BUG-001 FIX: Use try-catch with unique constraint error handling
    // instead of check-then-create (TOCTOU vulnerable)
    let createdUser: User;
    try {
      createdUser = await this.userRepo.create({
        email,
        name: name ?? email.split('@')[0],
        password: hashedPassword,
        hasCompletedOnboarding: false,
      });
    } catch (error) {
      // Handle unique constraint violation (P2002)
      if (this.userRepo.isUniqueConstraintError(error)) {
        this.logger.warn(`Signup attempt for existing email`, this.context, {
          email,
        });
        throw new EmailConflictError(email);
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

    const accessTokenPayload = {
      id: createdUser.id,
      email: createdUser.email,
      hasCompletedOnboarding: createdUser.hasCompletedOnboarding,
    };
    const accessToken = this.tokenService.generateToken(accessTokenPayload);

    return this.buildAuthResponse(createdUser, accessToken);
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<ValidatedUser | null> {
    const foundUser = await this.userRepo.findByEmail(email);

    if (!foundUser?.password) {
      this.logger.warn(`Failed login attempt - user not found`, this.context, {
        email,
      });
      return null;
    }

    const isPasswordValid = await this.passwordService.compare(
      password,
      foundUser.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(
        `Failed login attempt - invalid password`,
        this.context,
        { email },
      );
      return null;
    }

    const { password: _passwordField, ...validatedUserWithoutPassword } =
      foundUser;
    return validatedUserWithoutPassword;
  }

  async login(loginCredentials: Login) {
    const validatedUser = await this.validateUser(
      loginCredentials.email,
      loginCredentials.password,
    );

    if (!validatedUser) {
      throw new AuthenticationError(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    if (!validatedUser.email) {
      throw new AuthenticationError(ERROR_MESSAGES.INVALID_CREDENTIALS);
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
