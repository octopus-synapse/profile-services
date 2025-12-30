/**
 * Auth Service (Facade)
 * Provides unified API for authentication operations
 * Delegates to specialized services for implementation
 */

import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import {
  RequestVerificationDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/verification.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
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

  async signup(dto: SignupDto) {
    return this.authCoreService.signup(dto);
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<ValidatedUser | null> {
    return this.authCoreService.validateUser(email, password);
  }

  async login(dto: LoginDto) {
    return this.authCoreService.login(dto);
  }

  async refreshToken(userId: string) {
    return this.tokenRefreshService.refreshToken(userId);
  }

  // ==================== Email Verification ====================

  async requestEmailVerification(dto: RequestVerificationDto) {
    return this.emailVerificationService.requestVerification(dto);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    return this.emailVerificationService.verifyEmail(dto);
  }

  // ==================== Password Operations ====================

  async forgotPassword(dto: ForgotPasswordDto) {
    return this.passwordResetService.forgotPassword(dto);
  }

  async resetPassword(dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    return this.passwordResetService.changePassword(userId, dto);
  }

  // ==================== Account Management ====================

  async changeEmail(userId: string, dto: ChangeEmailDto) {
    return this.accountManagementService.changeEmail(userId, dto);
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    return this.accountManagementService.deleteAccount(userId, dto);
  }
}
