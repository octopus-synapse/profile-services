/**
 * Email Sender Service
 *
 * Pure nodemailer SMTP. Configure via env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
 *   EMAIL_FROM, EMAIL_FROM_NAME
 *
 * Framework-free POJO. Constructed via `buildEmailComposition` from
 * either the Nest module shell (`useFactory`) or the Elysia bootstrap.
 */

import { createTransport, type Transporter } from 'nodemailer';
import type { ConfigPort } from '@/shared-kernel/config';
import { type LoggerPort, redactEmail } from '@/shared-kernel/logger';
import {
  ConfigurationMissingException,
  FeatureDisabledException,
} from '../../exceptions/platform.exceptions';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailSenderService {
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly transporter: Transporter | null = null;

  constructor(
    private readonly configService: ConfigPort,
    private readonly logger: LoggerPort,
  ) {
    // P1 #41: consume the validated, typed env surface rather than
    // ConfigPort.get<T>() — the generic on `get` was a lie (it always
    // returned a string) and the old `parseInt`/string-equality coercion
    // here ran on every construction. The schema already coerces
    // SMTP_PORT to number and SMTP_SECURE to boolean at boot.
    const env = this.configService.env;
    this.fromEmail = env.EMAIL_FROM ?? 'noreply@patchcareers.com';
    this.fromName = env.EMAIL_FROM_NAME ?? 'Patch Careers';

    const host = env.SMTP_HOST;
    if (!host) {
      this.logger.warn('SMTP_HOST not set — emails disabled.', 'EmailSenderService');
      return;
    }

    const port = env.SMTP_PORT ?? 587;
    const user = env.SMTP_USER;
    const pass = env.SMTP_PASS;
    const secure = env.SMTP_SECURE ?? false;

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
        to: redactEmail(options.to),
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
      to: redactEmail(options.to),
      subject: options.subject,
    });
  }

  /**
   * Strict variant of `sendEmail` that throws typed exceptions instead
   * of silently no-oping. Use for transactional flows where a missed
   * email is a real failure (password resets, invoices). Throws:
   *   - `ConfigurationMissingException('SMTP_HOST')` when env unset.
   *   - `FeatureDisabledException('email')` when the transporter exists
   *     but was disabled by an operator after init.
   */
  async sendEmailStrict(options: SendEmailOptions): Promise<void> {
    if (!this.configService.env.SMTP_HOST) {
      throw new ConfigurationMissingException('SMTP_HOST');
    }
    if (!this.transporter) {
      throw new FeatureDisabledException('email');
    }
    await this.sendEmail(options);
  }

  private stripHtml(html: string | undefined): string {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
