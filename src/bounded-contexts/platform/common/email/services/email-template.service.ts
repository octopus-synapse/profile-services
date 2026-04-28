/**
 * Email Template Service
 * Handles email template generation and sending.
 *
 * Framework-free POJO. Composed via `buildEmailComposition`.
 */

import type { ConfigPort } from '@/shared-kernel/config';
import { getPasswordChangedTemplate } from '../templates/password-changed.template';
import { getPasswordResetTemplate } from '../templates/password-reset.template';
import { getVerificationEmailTemplate } from '../templates/verification.template';
import { getWelcomeEmailTemplate } from '../templates/welcome.template';
import { EmailSenderService } from './email-sender.service';

export class EmailTemplateService {
  constructor(
    private readonly senderService: EmailSenderService,
    private readonly configService: ConfigPort,
  ) {}

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    // Frontend route is /identity/verify-email; the ?token=<code> query param
    // auto-submits the 6-digit code for users who prefer clicking the link.
    const verificationUrl = `${frontendUrl}/identity/verify-email?token=${token}`;

    const html = getVerificationEmailTemplate(name, token, verificationUrl);

    await this.senderService.sendEmail({
      to: email,
      subject: 'Verifique seu email - Patch Careers',
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    const html = getPasswordResetTemplate(name, resetUrl);

    await this.senderService.sendEmail({
      to: email,
      subject: 'Redefinir senha - Patch Careers',
      html,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const html = getWelcomeEmailTemplate(name, frontendUrl);

    await this.senderService.sendEmail({ to: email, subject: 'Bem-vindo ao Patch Careers!', html });
  }

  /**
   * Send password changed email
   */
  async sendPasswordChangedEmail(email: string, name: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const html = getPasswordChangedTemplate(name, frontendUrl);

    await this.senderService.sendEmail({
      to: email,
      subject: 'Sua senha foi alterada - Patch Careers',
      html,
    });
  }
}
