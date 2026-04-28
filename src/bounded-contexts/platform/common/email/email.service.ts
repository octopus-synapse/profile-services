/**
 * Email Service (Facade)
 * Delegates to specialized services for email operations.
 *
 * Framework-free POJO. Constructed via `buildEmailComposition` from
 * either the Nest module shell or the Elysia bootstrap.
 */

import { EmailSenderService, type SendEmailOptions } from './services/email-sender.service';
import { EmailTemplateService } from './services/email-template.service';

export class EmailService {
  constructor(
    private readonly senderService: EmailSenderService,
    private readonly templateService: EmailTemplateService,
  ) {}

  /**
   * Send email
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    return this.senderService.sendEmail(options);
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    return this.templateService.sendVerificationEmail(email, name, token);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    return this.templateService.sendPasswordResetEmail(email, name, token);
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    return this.templateService.sendWelcomeEmail(email, name);
  }

  /**
   * Send password changed email
   */
  async sendPasswordChangedEmail(email: string, name: string): Promise<void> {
    return this.templateService.sendPasswordChangedEmail(email, name);
  }
}

// Re-export commonly used email types
export type { SendEmailOptions };
