/**
 * Account Management Service
 * Single Responsibility: Handle account-level operations (email change, deletion)
 *
 * BUG-033 FIX: Uses Prisma transactions to prevent TOCTOU race conditions
 * BUG-055 FIX: Revokes all tokens on account deletion
 * BUG-057 FIX: Revokes all tokens on email change
 *
 * Events Emitted:
 * - UserDeletedEvent: When a user account is deleted
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { EventPublisher } from '@/shared-kernel';
import { UserDeletedEvent } from '@/bounded-contexts/identity/domain/events';
import { PasswordService } from './password.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { ERROR_MESSAGES } from '@/shared-kernel';
import type {
  ChangeEmail,
  DeleteAccount,
} from '@/shared-kernel';

@Injectable()
export class AccountManagementService {
  private readonly context = 'AccountManagement';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly passwordService: PasswordService,
    private readonly tokenBlacklist: TokenBlacklistService,
    private readonly eventPublisher: EventPublisher,
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

    // BUG-055 FIX: Revoke all tokens BEFORE deleting account
    // This ensures any existing tokens become invalid immediately
    await this.tokenBlacklist.revokeAllUserTokens(userId);

    // CRITICAL: Publish event BEFORE delete so handlers can cleanup
    this.eventPublisher.publish(
      new UserDeletedEvent(userId, {
        reason: 'user_requested',
      }),
    );

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
      select: { id: true, email: true, password: true },
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
}
