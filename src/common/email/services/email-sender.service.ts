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
      this.logger.log('SendGrid configured successfully', 'EmailSenderService', {
        fromEmail: this.fromEmail,
        hasApiKey: !!apiKey,
      });
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

    try {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails: any = {
        to: options.to,
        subject: options.subject,
        from: this.fromEmail,
        error: errorMessage,
      };

      // Add more details for SendGrid errors
      if (error instanceof Error && 'response' in error) {
        const sgError = error as any;
        if (sgError.response?.body) {
          errorDetails.sendgridError = sgError.response.body;
        }
        if (sgError.response?.statusCode) {
          errorDetails.statusCode = sgError.response.statusCode;
        }
      }

      // Provide helpful error messages for common issues
      if (errorMessage.includes('Forbidden') || errorMessage.includes('403')) {
        this.logger.error(
          'SendGrid Forbidden error. Common causes: 1) Invalid API key, 2) Email "from" not verified in SendGrid, 3) Domain not verified, 4) API key lacks send permissions',
          error instanceof Error ? error.stack : 'Unknown error',
          'EmailSenderService',
          errorDetails,
        );
      } else {
        this.logger.error(
          'Failed to send email',
          error instanceof Error ? error.stack : 'Unknown error',
          'EmailSenderService',
          errorDetails,
        );
      }
      throw error;
    }
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
