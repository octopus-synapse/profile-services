/**
 * Email Template Service
 * Handles email template generation and sending
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getPasswordChangedTemplate } from '../templates/password-changed.template';
import { getPasswordResetTemplate } from '../templates/password-reset.template';
import { getVerificationEmailTemplate } from '../templates/verification.template';
import { getWelcomeEmailTemplate } from '../templates/welcome.template';
import { EmailSenderService } from './email-sender.service';

@Injectable()
export class EmailTemplateService {
  constructor(
    private readonly senderService: EmailSenderService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    const html = getVerificationEmailTemplate(name, verificationUrl);

    await this.senderService.sendEmail({
      to: email,
      subject: 'Verifique seu email - ProFile',
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
      subject: 'Redefinir senha - ProFile',
      html,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const html = getWelcomeEmailTemplate(name);

    await this.senderService.sendEmail({
      to: email,
      subject: 'Bem-vindo ao ProFile! 🎉',
      html,
    });
  }

  /**
   * Send password changed email
   */
  async sendPasswordChangedEmail(email: string, name: string): Promise<void> {
    const html = getPasswordChangedTemplate(name);

    await this.senderService.sendEmail({
      to: email,
      subject: 'Sua senha foi alterada - ProFile',
      html,
    });
  }
}
