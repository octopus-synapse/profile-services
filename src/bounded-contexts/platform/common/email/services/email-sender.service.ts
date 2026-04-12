/**
 * Email Sender Service
 * Sends email via SMTP (Mailpit in dev) or SendGrid (production)
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { AppLoggerService } from '../../logger/logger.service';

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
  private readonly transport: 'smtp' | 'sendgrid' | 'none';
  private readonly smtpTransporter: Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.fromEmail =
      this.configService.get<string>('EMAIL_FROM') ??
      this.configService.get<string>('SENDGRID_EMAIL_FROM') ??
      'noreply@profile.com';
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME') ?? 'ProFile';

    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (smtpHost) {
      const smtpPort = this.configService.get<number>('SMTP_PORT') ?? 1025;
      this.smtpTransporter = createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
      });
      this.transport = 'smtp';
      this.isConfigured = true;
      this.logger.log(`SMTP configured: ${smtpHost}:${smtpPort}`, 'EmailSenderService');
    } else if (apiKey) {
      try {
        const sendgrid = require('@sendgrid/mail');
        sgMail = sendgrid.default ?? sendgrid;
        if (sgMail && typeof sgMail.setApiKey === 'function') {
          sgMail.setApiKey(apiKey);
          this.transport = 'sendgrid';
          this.isConfigured = true;
          this.logger.log('SendGrid configured successfully', 'EmailSenderService');
        } else {
          this.transport = 'none';
          this.isConfigured = false;
          this.logger.warn('SendGrid module not properly loaded.', 'EmailSenderService');
        }
      } catch {
        this.transport = 'none';
        this.isConfigured = false;
        this.logger.warn('Failed to load SendGrid module.', 'EmailSenderService');
      }
    } else {
      this.transport = 'none';
      this.isConfigured = false;
      this.logger.warn('No email transport configured.', 'EmailSenderService');
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn('Email not configured. Skipping.', 'EmailSenderService', {
        to: options.to,
        subject: options.subject,
      });
      return;
    }

    const from = { name: this.fromName, address: this.fromEmail };
    const text = options.text ?? this.stripHtml(options.html);

    if (this.transport === 'smtp' && this.smtpTransporter) {
      await this.smtpTransporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text,
      });
    } else if (this.transport === 'sendgrid' && sgMail) {
      await sgMail.send({
        to: options.to,
        from: { email: this.fromEmail, name: this.fromName },
        subject: options.subject,
        html: options.html,
        text,
      });
    }

    this.logger.log(`Email sent via ${this.transport}`, 'EmailSenderService', {
      to: options.to,
      subject: options.subject,
    });
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
