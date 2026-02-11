/**
 * Email Verification Service
 * Single Responsibility: Handle email verification flow
 */

import { Injectable } from '@nestjs/common';
import { EmailService } from '@/bounded-contexts/platform/common/email/email.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { RequestVerification, VerifyEmail } from '@/shared-kernel';
import { EventPublisher } from '@/shared-kernel';
import { UserVerifiedEvent } from '../../domain/events';
import { VerificationTokenService } from './verification-token.service';

@Injectable()
export class EmailVerificationService {
  private readonly context = 'EmailVerification';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly emailService: EmailService,
    private readonly tokenService: VerificationTokenService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async requestVerification(dto: RequestVerification, userId?: string) {
    let email = dto.email;

    // If email not provided, get from authenticated user
    if (!email && userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, emailVerified: true },
      });
      if (!user) {
        throw new Error('User not found');
      }
      email = user.email ?? undefined;

      if (user.emailVerified) {
        return this.buildSuccessResponse('Email is already verified');
      }
    }

    if (!email) {
      throw new Error('Email is required');
    }

    const user = await this.findUserByEmail(email);

    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return this.buildSuccessResponse('If the email exists, a verification link has been sent');
    }

    if (user.emailVerified) {
      return this.buildSuccessResponse('Email is already verified');
    }

    const token = await this.tokenService.createEmailVerificationToken(email);

    this.logger.log(`Verification token created`, this.context, {
      email,
    });

    await this.sendVerificationEmail(email, user.name, token);

    return {
      success: true,
      message: 'Verification email sent',
      ...(process.env.NODE_ENV !== 'production' && { token }),
    };
  }

  async verifyEmail(dto: VerifyEmail) {
    const email = await this.tokenService.validateEmailVerificationToken(dto.token);

    await this.markEmailAsVerified(email);

    const user = await this.findUserByEmail(email);
    if (user) {
      this.eventPublisher.publish(
        new UserVerifiedEvent(user.id, {
          verifiedAt: new Date(),
        }),
      );
    }

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
      await this.emailService.sendVerificationEmail(email, name ?? 'Usuário', token);
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
      await this.emailService.sendWelcomeEmail(email, user.name ?? 'Usuário');
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
