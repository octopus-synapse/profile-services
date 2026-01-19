/**
 * Account Management Service
 * Single Responsibility: Handle account-level operations (email change, deletion)
 *
 * BUG-033 FIX: Uses Prisma transactions to prevent TOCTOU race conditions
 * BUG-055 FIX: Revokes all tokens on account deletion
 * BUG-057 FIX: Revokes all tokens on email change
 */

import { Injectable } from '@nestjs/common';
import {
  AuthenticationError,
  EmailConflictError,
} from '@octopus-synapse/profile-contracts';
import { AppLoggerService } from '../../common/logger/logger.service';
import { PasswordService } from './password.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';
import type {
  ChangeEmail,
  DeleteAccount,
} from '@octopus-synapse/profile-contracts';
import { AuthUserRepository } from '../repositories';

@Injectable()
export class AccountManagementService {
  private readonly context = 'AccountManagement';

  constructor(
    private readonly userRepo: AuthUserRepository,
    private readonly logger: AppLoggerService,
    private readonly passwordService: PasswordService,
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {}

  async changeEmail(userId: string, dto: ChangeEmail) {
    const { newEmail, currentPassword } = dto;

    const user = await this.findUserWithPassword(userId);

    await this.validatePassword(user, currentPassword);

    // BUG-033 FIX: Use try-catch with unique constraint instead of check-then-update
    try {
      await this.userRepo.updateEmail(userId, newEmail);
    } catch (error) {
      if (this.userRepo.isUniqueConstraintError(error)) {
        throw new EmailConflictError(newEmail);
      }
      throw error;
    }

    // BUG-057 FIX: Revoke all existing tokens after email change
    await this.tokenBlacklist.revokeAllUserTokens(userId);

    this.logger.log(`Email changed for user`, this.context, { userId });

    return {
      success: true,
      message: 'Email changed successfully. Please verify your new email.',
    };
  }

  async deleteAccount(userId: string, dto: DeleteAccount) {
    const { password } = dto;

    const user = await this.findUserWithPassword(userId);

    await this.validatePassword(user, password);

    // BUG-055 FIX: Revoke all tokens BEFORE deleting account
    // This ensures any existing tokens become invalid immediately
    await this.tokenBlacklist.revokeAllUserTokens(userId);

    await this.userRepo.delete(userId);

    this.logger.log(`Account deleted`, this.context, { userId });

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  private async findUserWithPassword(userId: string) {
    const user = await this.userRepo.findByIdWithPassword(userId);

    if (!user?.password) {
      throw new AuthenticationError(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    return { ...user, password: user.password };
  }

  private async validatePassword(
    user: { password: string },
    password: string,
  ): Promise<void> {
    const isValid = await this.passwordService.compare(password, user.password);

    if (!isValid) {
      throw new AuthenticationError(ERROR_MESSAGES.PASSWORD_INCORRECT);
    }
  }
}
