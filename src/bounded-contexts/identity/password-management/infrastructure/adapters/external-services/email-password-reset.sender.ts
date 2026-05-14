import { ConfigPort } from '@/shared-kernel/config';
import { PasswordResetEmailPort } from '../../../domain/ports';

/**
 * Abstract port for the platform email facade. Mirrors the
 * `EmailService` template method directly so callers can't reach
 * the generic `sendEmail` path that drops template/context.
 * The URL inside the email is built by `EmailTemplateService`
 * using `FRONTEND_URL` (with prod fail-fast), so APP_URL plumbing
 * stays out of the adapter.
 */
export abstract class EmailServicePort {
  abstract sendPasswordResetEmail(email: string, name: string, token: string): Promise<void>;
}

export class EmailPasswordResetSender extends PasswordResetEmailPort {
  constructor(
    private readonly emailService: EmailServicePort,
    _configService: ConfigPort,
  ) {
    super();
  }

  async sendResetEmail(email: string, userName: string | null, resetToken: string): Promise<void> {
    await this.emailService.sendPasswordResetEmail(
      email,
      userName ?? 'User',
      resetToken,
    );
  }
}
