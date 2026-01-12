/**
 * Account Management Service
 * Single Responsibility: Handle account-level operations (email change, deletion)
 *
 * BUG-033 FIX: Uses Prisma transactions to prevent TOCTOU race conditions
 * BUG-055 FIX: Revokes all tokens on account deletion
 * BUG-057 FIX: Revokes all tokens on email change
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { PasswordService } from './password.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';
import type {
  ChangeEmail,
  DeleteAccount,
} from '@octopus-synapse/profile-contracts';

@Injectable()
export class AccountManagementService {
  private readonly context = 'AccountManagement';

  constructor(
    private readonly prisma: PrismaService,
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
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          email: newEmail,
          emailVerified: null, // Reset verification
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_IN_USE);
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
    await this.preventLastAdminDeletion(user.role);

    // BUG-055 FIX: Revoke all tokens BEFORE deleting account
    // This ensures any existing tokens become invalid immediately
    await this.tokenBlacklist.revokeAllUserTokens(userId);

    await this.prisma.user.delete({ where: { id: userId } });

    this.logger.log(`Account deleted`, this.context, { userId });

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  private async findUserWithPassword(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true, role: true },
    });

    if (!user?.password) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    return { ...user, password: user.password };
  }

  private async validatePassword(
    user: { password: string },
    password: string,
  ): Promise<void> {
    const isValid = await this.passwordService.compare(password, user.password);

    if (!isValid) {
      throw new UnauthorizedException(ERROR_MESSAGES.PASSWORD_INCORRECT);
    }
  }

  private async preventLastAdminDeletion(role: string): Promise<void> {
    if (role !== 'ADMIN') return;

    const adminCount = await this.prisma.user.count({
      where: { role: 'ADMIN' },
    });

    if (adminCount <= 1) {
      throw new BadRequestException(ERROR_MESSAGES.CANNOT_DELETE_LAST_ADMIN);
    }
  }
}
