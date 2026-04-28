import { ConfigPort } from '@/shared-kernel/config';
import { VerificationEmailSenderPort } from '../../../domain/ports';

/** Abstract port for the platform email service (so adapters bind to it via DI). */
export abstract class EmailServicePort {
  abstract sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, unknown>;
  }): Promise<void>;
}

export class EmailVerificationSender extends VerificationEmailSenderPort {
  private readonly appUrl: string;

  constructor(
    private readonly emailService: EmailServicePort,
    private readonly configService: ConfigPort,
  ) {
    super();
    this.appUrl = this.configService.getOrDefault<string>('APP_URL', 'http://localhost:3000');
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
      context: { userName: userName || 'User', verificationUrl, expirationHours: 24 },
    });
  }
}
