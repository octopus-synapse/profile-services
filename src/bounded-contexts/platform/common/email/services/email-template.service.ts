/**
 * Email Template Service
 * Handles email template generation and sending.
 *
 * Framework-free POJO. Composed via `buildEmailComposition`.
 */

import type { ConfigPort } from '@/shared-kernel/config';
import { getChangeCodeTemplate } from '../templates/change-code.template';
import { getPasswordChangedTemplate } from '../templates/password-changed.template';
import { getPasswordResetTemplate } from '../templates/password-reset.template';
import { getVerificationEmailTemplate } from '../templates/verification.template';
import { getWelcomeEmailTemplate } from '../templates/welcome.template';
import { EmailSenderService } from './email-sender.service';

/**
 * P2-121 — read FRONTEND_URL once and fail-fast in prod when it's
 * missing. The previous behavior silently fell back to
 * `http://localhost:3000` on every call site — fine in dev, but in
 * prod it sends users a verification / reset link that 404s on the
 * end user's machine and looks like a phishing attempt to email
 * scanners. The dev fallback is preserved so local boot still works.
 */
function resolveFrontendUrl(config: ConfigPort): string {
  const fromEnv = config.get<string>('FRONTEND_URL');
  if (fromEnv) return fromEnv;
  if (config.get<string>('NODE_ENV') === 'production') {
    throw new Error(
      'FRONTEND_URL is required in production but was not configured — refusing to send mail with a localhost link.',
    );
  }
  return 'http://localhost:3000';
}

export class EmailTemplateService {
  private readonly frontendUrl: string;

  constructor(
    private readonly senderService: EmailSenderService,
    private readonly configService: ConfigPort,
  ) {
    this.frontendUrl = resolveFrontendUrl(configService);
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const frontendUrl = this.frontendUrl;
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
    const frontendUrl = this.frontendUrl;
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
    const frontendUrl = this.frontendUrl;
    const html = getWelcomeEmailTemplate(name, frontendUrl);

    await this.senderService.sendEmail({ to: email, subject: 'Bem-vindo ao Patch Careers!', html });
  }

  /**
   * Send password changed email
   */
  async sendPasswordChangedEmail(email: string, name: string): Promise<void> {
    const frontendUrl = this.frontendUrl;
    const html = getPasswordChangedTemplate(name, frontendUrl);

    await this.senderService.sendEmail({
      to: email,
      subject: 'Sua senha foi alterada - Patch Careers',
      html,
    });
  }

  /**
   * Send the 6-digit code that confirms an email-change request. The code is
   * delivered to the NEW address (proving the user controls it).
   */
  async sendEmailChangeCode(email: string, name: string, code: string): Promise<void> {
    const html = getChangeCodeTemplate({ name, code, actionLabel: 'alterar seu e-mail' });
    await this.senderService.sendEmail({
      to: email,
      subject: 'Confirme seu novo e-mail - Patch Careers',
      html,
    });
  }

  /**
   * Send the 6-digit code that confirms a password-change request. Delivered
   * to the user's current address.
   */
  async sendPasswordChangeCode(email: string, name: string, code: string): Promise<void> {
    const html = getChangeCodeTemplate({ name, code, actionLabel: 'alterar sua senha' });
    await this.senderService.sendEmail({
      to: email,
      subject: 'Confirme a alteração de senha - Patch Careers',
      html,
    });
  }
}
