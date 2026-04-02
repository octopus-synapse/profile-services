import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { VerificationEmailSenderPort } from '../../../domain/ports';

// Interface for the email service port from shared kernel
interface EmailServicePort {
  sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, unknown>;
  }): Promise<void>;
}

const EMAIL_SERVICE = Symbol('EmailServicePort');

@Injectable()
export class EmailVerificationSender implements VerificationEmailSenderPort {
  private readonly appUrl: string;

  constructor(
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailServicePort,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  async sendVerificationEmail(
    email: string,
    userName: string | null,
    verificationToken: string,
  ): Promise<void> {
    const verificationUrl = `${this.appUrl}/auth/verify-email?token=${verificationToken}`;

    await this.emailService.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      template: 'email-verification',
      context: {
        userName: userName || 'User',
        verificationUrl,
        expirationHours: 24,
      },
    });
  }
}

export { EMAIL_SERVICE };
