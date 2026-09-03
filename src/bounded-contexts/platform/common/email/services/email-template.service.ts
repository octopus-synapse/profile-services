/**
 * Email Template Service
 * Handles email template generation and sending.
 *
 * Framework-free POJO. Composed via `buildEmailComposition`.
 */

import type { ConfigPort } from '@/shared-kernel/config';
import type { LoggerPort } from '@/shared-kernel/logger';
import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';
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

/**
 * Which language an address should be written to in (decision 5 / ADR-003):
 * the account's `UserPreferences.language`, when the address belongs to an
 * account. `null` for a stranger (pre-signup verification), where the caller
 * knows the request's locale better than we do.
 */
export type AccountLocaleLookup = (email: string) => Promise<Locale | null>;

const SUBJECT = {
  'pt-BR': {
    verification: 'Verifique seu email - Patch Careers',
    passwordReset: 'Redefinir senha - Patch Careers',
    welcome: 'Bem-vindo ao Patch Careers!',
    passwordChanged: 'Sua senha foi alterada - Patch Careers',
    emailChangeCode: 'Confirme seu novo e-mail - Patch Careers',
    passwordChangeCode: 'Confirme a alteração de senha - Patch Careers',
    accountDeletionCode: 'Confirme a exclusão da conta - Patch Careers',
  },
  en: {
    verification: 'Verify your email - Patch Careers',
    passwordReset: 'Reset your password - Patch Careers',
    welcome: 'Welcome to Patch Careers!',
    passwordChanged: 'Your password was changed - Patch Careers',
    emailChangeCode: 'Confirm your new email - Patch Careers',
    passwordChangeCode: 'Confirm your password change - Patch Careers',
    accountDeletionCode: 'Confirm your account deletion - Patch Careers',
  },
} as const;

export class EmailTemplateService {
  private readonly frontendUrl: string;

  constructor(
    private readonly senderService: EmailSenderService,
    private readonly configService: ConfigPort,
    private readonly logger: LoggerPort,
    private readonly accountLocale: AccountLocaleLookup = async () => null,
  ) {
    this.frontendUrl = resolveFrontendUrl(configService);
  }

  /** Explicit locale wins; else the account's; else the product default. */
  private async localeFor(email: string, explicit?: Locale): Promise<Locale> {
    if (explicit) return explicit;
    try {
      return (await this.accountLocale(email)) ?? 'pt-BR';
    } catch (error) {
      // The mail still goes out; only its language falls back.
      this.logger.warn(
        `Could not read the account language for ${email}: ${error instanceof Error ? error.message : 'unknown'}`,
        'EmailTemplateService',
      );
      return 'pt-BR';
    }
  }

  async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
    locale?: Locale,
  ): Promise<void> {
    const lang = await this.localeFor(email, locale);
    const frontendUrl = this.frontendUrl;
    // Frontend route is /identity/verify-email; the ?token=<code> query param
    // auto-submits the 6-digit code for users who prefer clicking the link.
    const verificationUrl = `${frontendUrl}/identity/verify-email?token=${token}`;
    const html = getVerificationEmailTemplate(name, token, verificationUrl, lang);
    await this.senderService.sendEmail({ to: email, subject: SUBJECT[lang].verification, html });
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
    locale?: Locale,
  ): Promise<void> {
    const lang = await this.localeFor(email, locale);
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;
    const html = getPasswordResetTemplate(name, resetUrl, lang);
    await this.senderService.sendEmail({ to: email, subject: SUBJECT[lang].passwordReset, html });
  }

  async sendWelcomeEmail(email: string, name: string, locale?: Locale): Promise<void> {
    const lang = await this.localeFor(email, locale);
    const html = getWelcomeEmailTemplate(name, this.frontendUrl, lang);
    await this.senderService.sendEmail({ to: email, subject: SUBJECT[lang].welcome, html });
  }

  async sendPasswordChangedEmail(email: string, name: string, locale?: Locale): Promise<void> {
    const lang = await this.localeFor(email, locale);
    const html = getPasswordChangedTemplate(name, this.frontendUrl, lang);
    await this.senderService.sendEmail({ to: email, subject: SUBJECT[lang].passwordChanged, html });
  }

  async sendEmailChangeCode(
    email: string,
    name: string,
    code: string,
    locale?: Locale,
  ): Promise<void> {
    const lang = await this.localeFor(email, locale);
    const html = getChangeCodeTemplate({ name, code, action: 'change-email', locale: lang });
    await this.senderService.sendEmail({ to: email, subject: SUBJECT[lang].emailChangeCode, html });
  }

  async sendPasswordChangeCode(
    email: string,
    name: string,
    code: string,
    locale?: Locale,
  ): Promise<void> {
    const lang = await this.localeFor(email, locale);
    const html = getChangeCodeTemplate({ name, code, action: 'change-password', locale: lang });
    await this.senderService.sendEmail({
      to: email,
      subject: SUBJECT[lang].passwordChangeCode,
      html,
    });
  }

  async sendAccountDeletionCode(
    email: string,
    name: string,
    code: string,
    locale?: Locale,
  ): Promise<void> {
    const lang = await this.localeFor(email, locale);
    const html = getChangeCodeTemplate({ name, code, action: 'delete-account', locale: lang });
    await this.senderService.sendEmail({
      to: email,
      subject: SUBJECT[lang].accountDeletionCode,
      html,
    });
  }
}
