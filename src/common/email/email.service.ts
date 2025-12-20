import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { AppLoggerService } from '../logger/logger.service';
import { getVerificationEmailTemplate } from './templates/verification.template';
import { getPasswordResetTemplate } from './templates/password-reset.template';
import { getWelcomeEmailTemplate } from './templates/welcome.template';
import { getPasswordChangedTemplate } from './templates/password-changed.template';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly isConfigured: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') || 'noreply@profile.com';
    this.fromName =
      this.configService.get<string>('EMAIL_FROM_NAME') || 'ProFile';

    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
      this.logger.log('SendGrid configured successfully', 'EmailService');
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'SendGrid API key not found. Email sending will be disabled.',
        'EmailService',
      );
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(
        'Email service not configured. Skipping email send.',
        'EmailService',
        { to: options.to, subject: options.subject },
      );
      return;
    }

    try {
      const msg = {
        to: options.to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      await sgMail.send(msg);

      this.logger.log('Email sent successfully', 'EmailService', {
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      this.logger.error(
        'Failed to send email',
        error instanceof Error ? error.stack : 'Unknown error',
        'EmailService',
        {
          to: options.to,
          subject: options.subject,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
      throw error;
    }
  }

  async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    const html = getVerificationEmailTemplate(name, verificationUrl);

    await this.sendEmail({
      to: email,
      subject: 'Verifique seu email - ProFile',
      html,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    const html = getPasswordResetTemplate(name, resetUrl);

    await this.sendEmail({
      to: email,
      subject: 'Redefinir senha - ProFile',
      html,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const html = getWelcomeEmailTemplate(name);

    await this.sendEmail({
      to: email,
      subject: 'Bem-vindo ao ProFile! 🎉',
      html,
    });
  }

  async sendPasswordChangedEmail(email: string, name: string): Promise<void> {
    const html = getPasswordChangedTemplate(name);

    await this.sendEmail({
      to: email,
      subject: 'Sua senha foi alterada - ProFile',
      html,
    });
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
