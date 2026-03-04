import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PasswordResetEmailPort } from '../../ports/outbound';

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
export class EmailPasswordResetSender implements PasswordResetEmailPort {
  private readonly appUrl: string;

  constructor(
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailServicePort,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  async sendResetEmail(email: string, userName: string | null, resetToken: string): Promise<void> {
    const resetUrl = `${this.appUrl}/auth/reset-password?token=${resetToken}`;

    await this.emailService.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      template: 'password-reset',
      context: {
        userName: userName || 'User',
        resetUrl,
        expirationHours: 24,
      },
    });
  }
}

export { EMAIL_SERVICE };
