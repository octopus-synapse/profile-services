/**
 * Pre-Signup Verification Store Port
 *
 * Outbound port for the identifier-first flow's pre-account challenges:
 * the 6-digit code sent to an e-mail that has NO user row yet, so it
 * cannot live in `EmailVerificationToken` (whose `userId` FK is NOT
 * NULL). One challenge per e-mail; the store's TTL is the code's
 * lifetime and doubles as garbage collection.
 */

export interface PreSignupChallenge {
  /** SHA-256 digest of the 6-digit code — never the plaintext. */
  codeHash: string;
  /** Failed confirm attempts against this challenge. */
  attempts: number;
  /** Issue timestamp (ms) — drives the resend cooldown. */
  createdAtMs: number;
}

export abstract class PreSignupVerificationStorePort {
  abstract set(email: string, challenge: PreSignupChallenge, ttlSeconds: number): Promise<void>;
  abstract find(email: string): Promise<PreSignupChallenge | null>;
  abstract delete(email: string): Promise<void>;
}
