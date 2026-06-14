/**
 * Minimal outbound port over the shared verification-code table, scoped to the
 * credential-change purposes (email change / password change). The composition
 * root satisfies this with the identity/email-verification repository
 * (structural conformance), so the 6-digit-code engine isn't duplicated.
 */

export type CodePurpose = 'EMAIL_CHANGE' | 'PASSWORD_CHANGE';

export interface PendingCode {
  userId: string;
  /** EMAIL_CHANGE: the new address to commit on confirm. */
  pendingEmail: string | null;
  /** PASSWORD_CHANGE: the bcrypt hash of the new password to apply on confirm. */
  pendingPasswordHash: string | null;
  expiresAt: Date;
}

export interface CreateCodeInput {
  userId: string;
  token: string;
  /** Address the code was sent to. */
  email: string;
  expiresAt: Date;
  purpose: CodePurpose;
  pendingEmail?: string;
  pendingPasswordHash?: string;
}

export abstract class VerificationCodeStorePort {
  abstract createPurposeToken(input: CreateCodeInput): Promise<void>;
  abstract findPurposeToken(
    userId: string,
    token: string,
    purpose: CodePurpose,
  ): Promise<PendingCode | null>;
  abstract deleteUserPurposeTokens(userId: string, purpose: CodePurpose): Promise<void>;
}
