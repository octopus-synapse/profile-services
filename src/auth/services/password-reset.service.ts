/**
 * Password Reset Service
 * Single Responsibility: Handle password reset and change flows
 */

import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { EmailService } from '../../common/email/email.service';
import { PasswordService } from './password.service';
import { VerificationTokenService } from './verification-token.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '../dto/verification.dto';
import { ERROR_MESSAGES } from '../../common/constants/app.constants';

@Injectable()
export class PasswordResetService {
  private readonly context = 'PasswordReset';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly emailService: EmailService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: VerificationTokenService,
  ) {}

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findUserByEmail(dto.email);

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        emailSent: false, // Don't reveal if user exists, but indicate email wasn't sent
      };
    }

    const token = await this.tokenService.createPasswordResetToken(dto.email);

    this.logger.log(`Password reset token created`, this.context, {
      email: dto.email,
    });

    // Try to send email and track if it was successful
    let emailSent = false;
    try {
      await this.sendPasswordResetEmail(dto.email, user.name, token);
      emailSent = true;
    } catch (error) {
      // Email failed to send, but we still created the token
      // Log the error but don't throw to prevent email enumeration
      this.logger.error(
        'Failed to send password reset email',
        error instanceof Error ? error.stack : 'Unknown error',
        this.context,
        { email: dto.email },
      );
      // Return success but indicate email was not sent
      // This prevents email enumeration while still informing the frontend
      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        emailSent: false,
        ...(process.env.NODE_ENV !== 'production' && { token }),
      };
    }

    return {
      success: true,
      message: 'Password reset email sent',
      emailSent,
      ...(process.env.NODE_ENV !== 'production' && { token }),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = await this.tokenService.validatePasswordResetToken(dto.token);

    const hashedPassword = await this.passwordService.hash(dto.password);

    await this.updatePassword(email, hashedPassword);

    this.logger.log(`Password reset successfully`, this.context, { email });

    return this.buildSuccessResponse('Password reset successfully');
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.findUserById(userId);

    if (!user?.password) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const isCurrentPasswordValid = await this.passwordService.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException(
        ERROR_MESSAGES.CURRENT_PASSWORD_INCORRECT,
      );
    }

    const hashedPassword = await this.passwordService.hash(dto.newPassword);

    await this.updatePasswordById(userId, hashedPassword);

    this.logger.log(`Password changed successfully`, this.context, { userId });

    if (user.email) {
      await this.sendPasswordChangedEmail(user.email, user.name);
    }

    return this.buildSuccessResponse('Password changed successfully');
  }

  private async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });
  }

  private async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, password: true },
    });
  }

  private async updatePassword(email: string, password: string): Promise<void> {
    await this.prisma.user.update({
      where: { email },
      data: { password },
    });
  }

  private async updatePasswordById(
    userId: string,
    password: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password },
    });
  }

  private async sendPasswordResetEmail(
    email: string,
    name: string | null,
    token: string,
  ): Promise<void> {
    // Don't catch error here - let it propagate so forgotPassword can track if email was sent
    await this.emailService.sendPasswordResetEmail(
      email,
      name ?? 'Usuário',
      token,
    );
  }

  private async sendPasswordChangedEmail(
    email: string,
    name: string | null,
  ): Promise<void> {
    try {
      await this.emailService.sendPasswordChangedEmail(
        email,
        name ?? 'Usuário',
      );
    } catch (error) {
      this.logger.error(
        'Failed to send password changed email',
        error instanceof Error ? error.stack : 'Unknown error',
        this.context,
      );
    }
  }

  private buildSuccessResponse(message: string) {
    return { success: true, message };
  }
}
