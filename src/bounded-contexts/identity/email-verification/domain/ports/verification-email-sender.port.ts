/**
 * Verification Email Sender Port
 *
 * Outbound port for sending verification emails. `locale` is the language
 * to write in when the recipient has no account to read it from
 * (pre-signup); otherwise the mail service resolves it from the account.
 */

import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';

export abstract class VerificationEmailSenderPort {
  abstract sendVerificationEmail(
    email: string,
    userName: string | null,
    verificationToken: string,
    locale?: Locale,
  ): Promise<void>;
}
