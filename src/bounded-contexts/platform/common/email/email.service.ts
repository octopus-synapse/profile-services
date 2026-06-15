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

  /**
   * Send the email-change confirmation code (to the new address).
   */
  async sendEmailChangeCode(email: string, name: string, code: string): Promise<void> {
    return this.templateService.sendEmailChangeCode(email, name, code);
  }

  /**
   * Send the password-change confirmation code (to the current address).
   */
  async sendPasswordChangeCode(email: string, name: string, code: string): Promise<void> {
    return this.templateService.sendPasswordChangeCode(email, name, code);
  }

  /**
   * Send the account-deletion confirmation code (to the current address).
   */
  async sendAccountDeletionCode(email: string, name: string, code: string): Promise<void> {
    return this.templateService.sendAccountDeletionCode(email, name, code);
  }
}

// Re-export commonly used email types
export type { SendEmailOptions };
