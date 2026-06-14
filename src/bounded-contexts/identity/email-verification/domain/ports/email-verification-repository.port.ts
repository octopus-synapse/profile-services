/**
 * Email Verification Repository Port
 *
 * Outbound port for email verification persistence operations.
 */

export interface UserVerificationStatus {
  id: string;
  email: string;
  emailVerified: boolean;
}

export interface VerificationTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
}

/** Discriminates which flow a verification code approves. Mirrors the
 *  Prisma `VerificationPurpose` enum; kept as a string union here so the
 *  port stays free of a Prisma import. */
export type VerificationPurposeValue = 'EMAIL_VERIFY' | 'EMAIL_CHANGE' | 'PASSWORD_CHANGE';

export interface CreatePurposeTokenInput {
  userId: string;
  token: string;
  /** Address the code was sent to. */
  email: string;
  expiresAt: Date;
  purpose: VerificationPurposeValue;
  /** EMAIL_CHANGE: the new address to commit on confirm. */
  pendingEmail?: string;
  /** PASSWORD_CHANGE: bcrypt hash of the validated new password. */
  pendingPasswordHash?: string;
}

export interface PurposeTokenData {
  userId: string;
  token: string;
  email: string;
  purpose: VerificationPurposeValue;
  pendingEmail: string | null;
  pendingPasswordHash: string | null;
  expiresAt: Date;
}

export abstract class EmailVerificationRepositoryPort {
  abstract findUserById(userId: string): Promise<UserVerificationStatus | null>;
  abstract findUserByEmail(email: string): Promise<UserVerificationStatus | null>;
  abstract createVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
    email: string,
  ): Promise<void>;
  abstract findVerificationToken(token: string): Promise<VerificationTokenData | null>;
  abstract deleteVerificationToken(token: string): Promise<void>;
  abstract deleteUserVerificationTokens(userId: string): Promise<void>;
  abstract markEmailAsVerified(userId: string): Promise<void>;
  abstract hasRecentToken(userId: string, withinMinutes: number): Promise<boolean>;
  abstract getLastTokenCreatedAt(userId: string): Promise<Date | null>;

  // --- Purpose-aware methods (email-change / password-change flows) ---
  /** Create a single-use code row carrying the pending payload for a purpose. */
  abstract createPurposeToken(input: CreatePurposeTokenInput): Promise<void>;
  /** Find an unexpired, unused code matching this user + purpose by its code. */
  abstract findPurposeToken(
    userId: string,
    token: string,
    purpose: VerificationPurposeValue,
  ): Promise<PurposeTokenData | null>;
  /** Consume (delete) all rows for a user+purpose — called on confirm and on re-request. */
  abstract deleteUserPurposeTokens(
    userId: string,
    purpose: VerificationPurposeValue,
  ): Promise<void>;
  /** Most recent code creation time for a user+purpose (resend cooldown). */
  abstract getLastTokenCreatedAtForPurpose(
    userId: string,
    purpose: VerificationPurposeValue,
  ): Promise<Date | null>;
}
