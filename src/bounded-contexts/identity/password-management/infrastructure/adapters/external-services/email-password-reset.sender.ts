import { Injectable } from '@nestjs/common';
import { ConfigPort } from '@/shared-kernel/config';
import { PasswordResetEmailPort } from '../../../domain/ports';

/** Abstract port for the platform email service (so adapters bind to it via DI). */
export abstract class EmailServicePort {
  abstract sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, unknown>;
  }): Promise<void>;
}

@Injectable()
export class EmailPasswordResetSender extends PasswordResetEmailPort {
  private readonly appUrl: string;

  constructor(
    private readonly emailService: EmailServicePort,
    private readonly configService: ConfigPort,
  ) {
    super();
    this.appUrl = this.configService.getOrDefault<string>('APP_URL', 'http://localhost:3000');
  }

  async sendResetEmail(email: string, userName: string | null, resetToken: string): Promise<void> {
    const resetUrl = `${this.appUrl}/auth/reset-password?token=${resetToken}`;

    await this.emailService.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      template: 'password-reset',
      context: { userName: userName || 'User', resetUrl, expirationHours: 24 },
    });
  }
}
