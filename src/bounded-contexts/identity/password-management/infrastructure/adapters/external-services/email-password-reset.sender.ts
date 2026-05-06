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

export class EmailPasswordResetSender extends PasswordResetEmailPort {
  private readonly appUrl: string;

  // P1-032 — `APP_URL` is required (no localhost fallback). A
  // deploy without it would mint password-reset emails pointing at
  // `http://localhost:3000` for prod users — broken links + a phishing
  // surface. Throwing at construction time means a misconfigured
  // service never reaches the email sender, and the bootstrap fails
  // fast with a clear error.
  constructor(
    private readonly emailService: EmailServicePort,
    private readonly configService: ConfigPort,
  ) {
    super();
    const appUrl = this.configService.get<string>('APP_URL');
    if (!appUrl) {
      throw new Error(
        'APP_URL is required for password-reset emails — refusing to mint links pointing at localhost',
      );
    }
    this.appUrl = appUrl;
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
