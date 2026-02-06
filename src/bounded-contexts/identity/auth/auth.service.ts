/**
 * Auth Service (Facade)
 * Provides unified API for authentication operations
 * Delegates to specialized services for implementation
 */

import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import type {
  RegisterCredentials,
  LoginCredentials,
  RequestVerification,
  EmailVerification,
  ResetPasswordRequest,
  NewPassword,
  ChangePassword,
  ChangeEmail,
  DeleteAccount,
} from '@/shared-kernel';
import {
  AuthCoreService,
  TokenRefreshService,
  EmailVerificationService,
  PasswordResetService,
  AccountManagementService,
} from './services';

type ValidatedUser = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly authCoreService: AuthCoreService,
    private readonly tokenRefreshService: TokenRefreshService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly accountManagementService: AccountManagementService,
  ) {}

  // ==================== Core Authentication ====================

  async signup(dto: RegisterCredentials) {
    return this.authCoreService.signup(dto);
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<ValidatedUser | null> {
    return this.authCoreService.validateUser(email, password);
  }

  async login(dto: LoginCredentials) {
    return this.authCoreService.login(dto);
  }

  async refreshToken(userId: string) {
    return this.tokenRefreshService.refreshToken(userId);
  }

  async refreshTokenWithToken(refreshToken: string) {
    return this.tokenRefreshService.refreshWithToken(refreshToken);
  }

  async getCurrentUser(userId: string) {
    return this.tokenRefreshService.getCurrentUser(userId);
  }

  // ==================== Email Verification ====================

  async requestEmailVerification(dto: RequestVerification, userId?: string) {
    return this.emailVerificationService.requestVerification(dto, userId);
  }

  async verifyEmail(dto: EmailVerification) {
    return this.emailVerificationService.verifyEmail(dto);
  }

  // ==================== Password Operations ====================

  async forgotPassword(dto: ResetPasswordRequest) {
    return this.passwordResetService.forgotPassword(dto);
  }

  async resetPassword(dto: NewPassword) {
    return this.passwordResetService.resetPassword(dto);
  }

  async changePassword(userId: string, dto: ChangePassword) {
    return this.passwordResetService.changePassword(userId, dto);
  }

  // ==================== Account Management ====================

  async changeEmail(userId: string, dto: ChangeEmail) {
    return this.accountManagementService.changeEmail(userId, dto);
  }

  async deleteAccount(userId: string, dto: DeleteAccount) {
    return this.accountManagementService.deleteAccount(userId, dto);
  }
}
