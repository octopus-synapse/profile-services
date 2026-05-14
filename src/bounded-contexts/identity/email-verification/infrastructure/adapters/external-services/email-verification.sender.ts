import { ConfigPort } from '@/shared-kernel/config';
import { VerificationEmailSenderPort } from '../../../domain/ports';

/**
 * Abstract port for the platform email facade. Mirrors the
 * `EmailService` template methods so callers can't accidentally
 * send a body-less mail through the generic `sendEmail` path
 * (which drops `template`/`context` silently).
 */
export abstract class EmailServicePort {
  abstract sendVerificationEmail(email: string, name: string, token: string): Promise<void>;
}

export class EmailVerificationSender extends VerificationEmailSenderPort {
  constructor(
    private readonly emailService: EmailServicePort,
    _configService: ConfigPort,
  ) {
    super();
  }

  async sendVerificationEmail(
    email: string,
    userName: string | null,
    verificationToken: string,
  ): Promise<void> {
    await this.emailService.sendVerificationEmail(
      email,
      userName ?? 'User',
      verificationToken,
    );
  }
}
