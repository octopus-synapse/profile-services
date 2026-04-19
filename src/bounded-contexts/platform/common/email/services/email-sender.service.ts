/**
 * Email Sender Service
 *
 * Pure nodemailer SMTP. Configure via env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
 *   EMAIL_FROM, EMAIL_FROM_NAME
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
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
  private readonly transporter: Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') ?? 'noreply@profile.com';
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME') ?? 'ProFile';

    const host = this.configService.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn('SMTP_HOST not set — emails disabled.', 'EmailSenderService');
      return;
    }

    const port = this.configService.get<number>('SMTP_PORT') ?? 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';

    this.transporter = createTransport({
      host,
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });

    this.logger.log(`SMTP configured: ${host}:${port}`, 'EmailSenderService');
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Email not configured. Skipping.', 'EmailSenderService', {
        to: options.to,
        subject: options.subject,
      });
      return;
    }

    await this.transporter.sendMail({
      from: { name: this.fromName, address: this.fromEmail },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text ?? this.stripHtml(options.html),
    });

    this.logger.log('Email sent', 'EmailSenderService', {
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
