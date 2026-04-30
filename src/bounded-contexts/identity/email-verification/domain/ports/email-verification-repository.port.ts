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
}
