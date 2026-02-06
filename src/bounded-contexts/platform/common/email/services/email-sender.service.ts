/**
 * Email Sender Service
 * Handles email sending via SendGrid
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '../../logger/logger.service';

// Dynamic import to avoid issues when SendGrid is not properly configured
let sgMail: typeof import('@sendgrid/mail') | null = null;

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailSenderService {
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly isConfigured: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    // Support both EMAIL_FROM and SENDGRID_EMAIL_FROM for compatibility
    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') ??
      this.configService.get<string>('SENDGRID_EMAIL_FROM') ??
      'noreply@profile.com';
    this.fromName =
      this.configService.get<string>('EMAIL_FROM_NAME') ?? 'ProFile';

    if (apiKey) {
      try {
        // Dynamic require to handle cases where SendGrid is not available
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
        const sendgrid = require('@sendgrid/mail');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        sgMail = sendgrid.default ?? sendgrid;
        if (sgMail && typeof sgMail.setApiKey === 'function') {
          sgMail.setApiKey(apiKey);
          this.isConfigured = true;
          this.logger.log(
            'SendGrid configured successfully',
            'EmailSenderService',
            {
              fromEmail: this.fromEmail,
              hasApiKey: !!apiKey,
            },
          );
        } else {
          this.isConfigured = false;
          this.logger.warn(
            'SendGrid module not properly loaded. Email sending will be disabled.',
            'EmailSenderService',
          );
        }
      } catch {
        this.isConfigured = false;
        this.logger.warn(
          'Failed to load SendGrid module. Email sending will be disabled.',
          'EmailSenderService',
        );
      }
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'SendGrid API key not found. Email sending will be disabled.',
        'EmailSenderService',
      );
    }
  }

  /**
   * Send email via SendGrid
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.isConfigured || !sgMail) {
      this.logger.warn(
        'Email service not configured. Skipping email send.',
        'EmailSenderService',
        { to: options.to, subject: options.subject },
      );
      return;
    }

    const msg = {
      to: options.to,
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      subject: options.subject,
      html: options.html,
      text: options.text ?? this.stripHtml(options.html),
    };

    await sgMail.send(msg);

    this.logger.log('Email sent successfully', 'EmailSenderService', {
      to: options.to,
      subject: options.subject,
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
