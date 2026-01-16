/**
 * Email Sender Service
 * Handles email sending via SendGrid
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { AppLoggerService } from '../../logger/logger.service';

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
        'SendGrid API key not found. Email sending will be disabled.',
        'EmailSenderService',
      );
    }
  }

  /**
   * Send email via SendGrid
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.isConfigured) {
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
