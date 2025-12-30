/**
 * Account Management Service
 * Single Responsibility: Handle account-level operations (email change, deletion)
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { PasswordService } from './password.service';
import { ERROR_MESSAGES } from '../../common/constants/app.constants';
import { ChangeEmailDto } from '../dto/change-email.dto';
import { DeleteAccountDto } from '../dto/delete-account.dto';

@Injectable()
export class AccountManagementService {
  private readonly context = 'AccountManagement';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly passwordService: PasswordService,
  ) {}

  async changeEmail(userId: string, dto: ChangeEmailDto) {
    const { newEmail, currentPassword } = dto;

    const user = await this.findUserWithPassword(userId);

    await this.validatePassword(user, currentPassword);
    await this.ensureEmailNotTaken(newEmail);

    await this.updateEmail(userId, newEmail);

    this.logger.log(`Email changed for user`, this.context, { userId });

    return {
      success: true,
      message: 'Email changed successfully. Please verify your new email.',
    };
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const { password } = dto;

    const user = await this.findUserWithPassword(userId);

    await this.validatePassword(user, password);
    await this.preventLastAdminDeletion(user.role);

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

    if (!user || !user.password) {
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

  private async ensureEmailNotTaken(email: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_IN_USE);
    }
  }

  private async updateEmail(userId: string, email: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email,
        emailVerified: null, // Reset verification
      },
    });
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
