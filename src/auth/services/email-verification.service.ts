/**
 * Email Verification Service
 * Single Responsibility: Handle email verification flow
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { EmailService } from '../../common/email/email.service';
import { VerificationTokenService } from './verification-token.service';
import {
  RequestVerificationDto,
  VerifyEmailDto,
} from '../dto/verification.dto';

@Injectable()
export class EmailVerificationService {
  private readonly context = 'EmailVerification';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly emailService: EmailService,
    private readonly tokenService: VerificationTokenService,
  ) {}

  async requestVerification(dto: RequestVerificationDto) {
    const user = await this.findUserByEmail(dto.email);

    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return this.buildSuccessResponse(
        'If the email exists, a verification link has been sent',
      );
    }

    if (user.emailVerified) {
      return this.buildSuccessResponse('Email is already verified');
    }

    const token = await this.tokenService.createEmailVerificationToken(
      dto.email,
    );

    this.logger.log(`Verification token created`, this.context, {
      email: dto.email,
    });

    await this.sendVerificationEmail(dto.email, user.name, token);

    return {
      success: true,
      message: 'Verification email sent',
      ...(process.env.NODE_ENV !== 'production' && { token }),
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const email = await this.tokenService.validateEmailVerificationToken(
      dto.token,
    );

    await this.markEmailAsVerified(email);

    this.logger.log(`Email verified successfully`, this.context, { email });

    await this.sendWelcomeEmail(email);

    return this.buildSuccessResponse('Email verified successfully');
  }

  private async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, emailVerified: true },
    });
  }

  private async markEmailAsVerified(email: string): Promise<void> {
    await this.prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });
  }

  private async sendVerificationEmail(
    email: string,
    name: string | null,
    token: string,
  ): Promise<void> {
    try {
      await this.emailService.sendVerificationEmail(
        email,
        name || 'Usuário',
        token,
      );
    } catch (error) {
      this.logger.error(
        'Failed to send verification email',
        error instanceof Error ? error.stack : 'Unknown error',
        this.context,
      );
    }
  }

  private async sendWelcomeEmail(email: string): Promise<void> {
    const user = await this.findUserByEmail(email);

    if (!user) return;

    try {
      await this.emailService.sendWelcomeEmail(email, user.name || 'Usuário');
    } catch (error) {
      this.logger.error(
        'Failed to send welcome email',
        error instanceof Error ? error.stack : 'Unknown error',
        this.context,
      );
    }
  }

  private buildSuccessResponse(message: string) {
    return { success: true, message };
  }
}
