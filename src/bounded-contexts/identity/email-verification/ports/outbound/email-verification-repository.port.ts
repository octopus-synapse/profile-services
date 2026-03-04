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

export interface EmailVerificationRepositoryPort {
  /**
   * Finds a user by ID with verification status
   */
  findUserById(userId: string): Promise<UserVerificationStatus | null>;

  /**
   * Finds a user by email with verification status
   */
  findUserByEmail(email: string): Promise<UserVerificationStatus | null>;

  /**
   * Stores a new verification token
   */
  createVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
    email: string,
  ): Promise<void>;

  /**
   * Finds a verification token
   */
  findVerificationToken(token: string): Promise<VerificationTokenData | null>;

  /**
   * Deletes a verification token
   */
  deleteVerificationToken(token: string): Promise<void>;

  /**
   * Deletes all tokens for a user
   */
  deleteUserVerificationTokens(userId: string): Promise<void>;

  /**
   * Marks user email as verified
   */
  markEmailAsVerified(userId: string): Promise<void>;

  /**
   * Checks if user has a recent token (within minutes)
   */
  hasRecentToken(userId: string, withinMinutes: number): Promise<boolean>;
}
